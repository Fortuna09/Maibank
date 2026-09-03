import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FinanceApiService } from './finance-api.service';
import {
  AllocationBucket,
  AllocationBucketId,
  AllocationSettings,
  CreateGoalPayload,
  CreateTransactionPayload,
  FinanceGoal,
  FinanceTransaction,
  TransactionType,
  AllocationMode,
  DEFAULT_ALLOCATION_SETTINGS,
  SalaryConfig,
} from '../Models/finance.model';
import {
  buildPercentageAllocations,
  buildSpecificAllocation,
  createBucketMap,
  makeBucketId,
  normalizeDate,
  normalizeSettings,
  roundCurrency,
} from '../Utils/finance.utils';

export * from '../Models/finance.model';

@Injectable({
  providedIn: 'root',
})
export class FinanceStoreService {
  private readonly api = inject(FinanceApiService);

  private readonly transactionsSignal = signal<FinanceTransaction[]>([]);
  private readonly goalsSignal = signal<FinanceGoal[]>([]);
  private readonly settingsSignal = signal<AllocationSettings>(DEFAULT_ALLOCATION_SETTINGS);

  readonly transactions = this.transactionsSignal.asReadonly();
  readonly goals = this.goalsSignal.asReadonly();
  readonly settings = this.settingsSignal.asReadonly();

  readonly totalEntradas = computed(() =>
    this.transactionsSignal()
      .filter((transaction) => transaction.type === 'entrada')
      .reduce((total, transaction) => total + transaction.amount, 0)
  );

  readonly totalSaidas = computed(() =>
    this.transactionsSignal()
      .filter((transaction) => transaction.type === 'saida')
      .reduce((total, transaction) => total + transaction.amount, 0)
  );

  readonly saldoAtual = computed(() => this.totalEntradas() - this.totalSaidas());

  readonly bucketBalances = computed(() => {
    const initialState = createBucketMap(this.settingsSignal().buckets);

    for (const transaction of this.transactionsSignal()) {
      for (const entry of transaction.allocations) {
        initialState[entry.bucketId] = (initialState[entry.bucketId] ?? 0) + entry.amount;
      }
    }

    return initialState;
  });

  readonly bucketSpent = computed(() => {
    const initialState = createBucketMap(this.settingsSignal().buckets);

    for (const transaction of this.transactionsSignal()) {
      if (transaction.type !== 'saida') {
        continue;
      }

      for (const entry of transaction.allocations) {
        if (initialState[entry.bucketId] === undefined) {
          continue;
        }

        initialState[entry.bucketId] += Math.abs(entry.amount);
      }
    }

    return initialState;
  });

  constructor() {
    void this.loadInitialData();
  }

  addTransaction(payload: CreateTransactionPayload): void {
    const normalizedAmount = Number(payload.amount);
    const direction = payload.type === 'entrada' ? 1 : -1;
    const allocations =
      payload.allocationMode === 'percentual'
        ? buildPercentageAllocations(normalizedAmount * direction, this.settingsSignal().buckets)
        : buildSpecificAllocation(normalizedAmount * direction, payload.bucketId);

    if (allocations.length === 0) {
      return;
    }

    void firstValueFrom(
      this.api.createTransaction({
        description: payload.description,
        type: payload.type,
        amount: normalizedAmount,
        category: payload.category,
        date: payload.date,
        allocationMode: payload.allocationMode,
        allocations,
      })
    )
      .then(() => this.refreshTransactions())
      .catch((error) => {
        console.error('Erro ao criar transacao', error);
      });
  }

  removeTransaction(transactionId: string): void {
    void firstValueFrom(this.api.deleteTransaction(transactionId))
      .then(() => this.refreshTransactions())
      .catch((error) => {
        console.error('Erro ao remover transacao', error);
      });
  }

  addGoal(payload: CreateGoalPayload): void {
    void firstValueFrom(this.api.createGoal(payload))
      .then(() => this.refreshGoals())
      .catch((error) => {
        console.error('Erro ao criar meta', error);
      });
  }

  updateGoalProgress(goalId: string, amountToAdd: number): void {
    const goal = this.goalsSignal().find((currentGoal) => currentGoal.id === goalId);
    const amount = Number(amountToAdd);
    if (!goal || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const previousGoals = this.goalsSignal();
    this.goalsSignal.set(
      previousGoals.map((currentGoal) =>
        currentGoal.id === goalId
          ? { ...currentGoal, currentAmount: currentGoal.currentAmount + amount }
          : currentGoal
      )
    );

    void firstValueFrom(this.api.addGoalContribution(goalId, amount))
      .then(() => this.refreshGoals())
      .catch((error) => {
        console.error('Erro ao adicionar valor à meta', error);
        this.goalsSignal.set(previousGoals);
      });
  }

  updateGoal(goalId: string, payload: Omit<FinanceGoal, 'id'>): void {
    const previousGoals = this.goalsSignal();
    const updatedGoal: FinanceGoal = { id: goalId, ...payload };
    this.goalsSignal.set(previousGoals.map((goal) => (goal.id === goalId ? updatedGoal : goal)));

    void firstValueFrom(this.api.updateGoal(goalId, payload))
      .then(() => this.refreshGoals())
      .catch((error) => {
        console.error('Erro ao atualizar meta', error);
        this.goalsSignal.set(previousGoals);
      });
  }

  addBucket(payload: { label: string; percentage: number }): AllocationBucket | null {
    const label = payload.label.trim();
    if (!label) {
      return null;
    }

    const nextBucket: AllocationBucket = {
      id: makeBucketId(label),
      label,
      percentage: Math.max(0, Number(payload.percentage)),
    };

    const nextSettings: AllocationSettings = {
      ...this.settingsSignal(),
      buckets: [...this.settingsSignal().buckets, nextBucket],
    };

    this.settingsSignal.set(nextSettings);

    void firstValueFrom(this.api.updateSettings(nextSettings))
      .then(() => this.refreshSettings())
      .catch((error) => {
        console.error('Erro ao adicionar divisao', error);
        this.refreshSettings();
      });

    return nextBucket;
  }

  removeBucket(bucketId: string): void {
    const nextBuckets = this.settingsSignal().buckets.filter((bucket) => bucket.id !== bucketId);
    if (nextBuckets.length === 0) {
      return;
    }

    const nextSettings: AllocationSettings = {
      ...this.settingsSignal(),
      buckets: nextBuckets,
    };

    this.settingsSignal.set(nextSettings);

    void firstValueFrom(this.api.updateSettings(nextSettings))
      .then(() => this.refreshSettings())
      .catch((error) => {
        console.error('Erro ao remover divisao', error);
        this.refreshSettings();
      });
  }

  updateAllocationSettings(settings: AllocationSettings): boolean {
    const normalizedBuckets = settings.buckets.map((bucket) => ({
      ...bucket,
      percentage: Math.max(0, Number(bucket.percentage)),
    }));

    const total = normalizedBuckets.reduce((sum, bucket) => sum + bucket.percentage, 0);
    if (Math.round(total) !== 100) {
      return false;
    }

    const nextSettings: AllocationSettings = {
      baseIncome: Math.max(0, Number(settings.baseIncome)),
      buckets: normalizedBuckets,
    };

    this.settingsSignal.set(nextSettings);

    void firstValueFrom(this.api.updateSettings(nextSettings))
      .then(() => this.refreshSettings())
      .catch((error) => {
        console.error('Erro ao atualizar configuracoes', error);
        this.refreshSettings();
      });

    return true;
  }

  removeGoal(goalId: string): void {
    void firstValueFrom(this.api.deleteGoal(goalId))
      .then(() => this.refreshGoals())
      .catch((error) => {
        console.error('Erro ao remover meta', error);
      });
  }

  getGoalProgress(goal: FinanceGoal): number {
    if (goal.targetAmount <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  }

  getGoalForecast(goal: FinanceGoal): {
    remainingAmount: number;
    projectedDate: string;
    statusText: string;
    isDelayed: boolean;
  } {
    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

    if (remainingAmount === 0) {
      return {
        remainingAmount: 0,
        projectedDate: goal.dueDate || 'Concluída',
        statusText: 'Concluída',
        isDelayed: false,
      };
    }

    if (goal.targetAmount <= 0 || goal.saveAmount <= 0) {
      return {
        remainingAmount,
        projectedDate: goal.dueDate || 'Sem previsão',
        statusText: goal.dueDate ? 'Em andamento' : 'Em andamento',
        isDelayed: false,
      };
    }

    const today = new Date();
    const periodMilliseconds = goal.saveFrequency === 'semanal' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const startDate = new Date(goal.createdAt || new Date().toISOString().slice(0, 10));
    const elapsedPeriods = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / periodMilliseconds));
    const expectedSavings = goal.saveAmount * elapsedPeriods;
    const missedAmount = Math.max(0, expectedSavings - goal.currentAmount);
    const adjustedRemaining = remainingAmount + missedAmount;
    const periodsNeeded = Math.max(1, Math.ceil(adjustedRemaining / goal.saveAmount));
    const projectedDate = new Date(today.getTime() + periodsNeeded * periodMilliseconds);

    const hasDueDate = !!goal.dueDate;
    const dueDate = goal.dueDate ? new Date(goal.dueDate) : null;
    const projectedPastDueDate = dueDate ? projectedDate.toISOString().slice(0, 10) > goal.dueDate! : false;
    const statusText = dueDate && (today > dueDate || projectedPastDueDate) ? 'Atrasada' : 'Em andamento';
    const isDelayed = statusText === 'Atrasada' || missedAmount > 0;

    if (!hasDueDate) {
      const label = goal.saveFrequency === 'semanal' ? `${periodsNeeded} ${periodsNeeded === 1 ? 'semana' : 'semanas'}` : `${periodsNeeded} ${periodsNeeded === 1 ? 'mês' : 'meses'}`;
      return {
        remainingAmount: adjustedRemaining,
        projectedDate: `Faltam ${label}`,
        statusText: statusText,
        isDelayed,
      };
    }

    return {
      remainingAmount: adjustedRemaining,
      projectedDate: projectedDate.toISOString().slice(0, 10),
      statusText,
      isDelayed,
    };
  }

  getBucketLabel(bucketId: AllocationBucketId): string {
    return this.settingsSignal().buckets.find((bucket) => bucket.id === bucketId)?.label ?? bucketId;
  }

  getBucketBudget(bucketId: AllocationBucketId): number {
    const bucket = this.settingsSignal().buckets.find((currentBucket) => currentBucket.id === bucketId);
    if (!bucket) {
      return 0;
    }

    return roundCurrency((this.settingsSignal().baseIncome * bucket.percentage) / 100);
  }

  getBucketSpent(bucketId: AllocationBucketId): number {
    return roundCurrency(this.bucketSpent()[bucketId] ?? 0);
  }

  getBucketRemaining(bucketId: AllocationBucketId): number {
    return roundCurrency(this.getBucketBudget(bucketId) + (this.bucketBalances()[bucketId] ?? 0));
  }

  getBucketUsagePercent(bucketId: AllocationBucketId): number {
    const budget = this.getBucketBudget(bucketId);
    if (budget <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((this.getBucketSpent(bucketId) / budget) * 100));
  }

  getAllocationPreviewBySalary(customIncome?: number): Array<{ bucketId: AllocationBucketId; label: string; amount: number; percentage: number }> {
    const income = customIncome ?? this.settingsSignal().baseIncome;

    return this.settingsSignal().buckets.map((bucket) => ({
      bucketId: bucket.id,
      label: bucket.label,
      percentage: bucket.percentage,
      amount: roundCurrency((income * bucket.percentage) / 100),
    }));
  }

  getMonthlyCashFlow(): Array<{ month: string; entradas: number; saidas: number }> {
    const monthlyMap = new Map<string, { entradas: number; saidas: number }>();

    for (const transaction of this.transactionsSignal()) {
      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthValues = monthlyMap.get(monthLabel) ?? { entradas: 0, saidas: 0 };

      if (transaction.type === 'entrada') {
        monthValues.entradas += transaction.amount;
      } else {
        monthValues.saidas += transaction.amount;
      }

      monthlyMap.set(monthLabel, monthValues);
    }

    return [...monthlyMap.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, values]) => ({
        month,
        entradas: values.entradas,
        saidas: values.saidas,
      }));
  }

  private async loadInitialData(): Promise<void> {
    await Promise.all([this.refreshSettings(), this.refreshTransactions(), this.refreshGoals()]);
  }

  private async refreshSettings(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.getSettings());
      const settings = normalizeSettings(response);

      this.settingsSignal.set({
        baseIncome: Number(settings.baseIncome ?? DEFAULT_ALLOCATION_SETTINGS.baseIncome),
        buckets: settings.buckets.length > 0 ? settings.buckets : DEFAULT_ALLOCATION_SETTINGS.buckets,
      });
    } catch (error) {
      console.error('Erro ao carregar configuracoes', error);
      this.settingsSignal.set(DEFAULT_ALLOCATION_SETTINGS);
    }
  }

  private async refreshTransactions(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.getTransactions());

      this.transactionsSignal.set(
        (response ?? []).map((transaction) => ({
          ...transaction,
          amount: Number(transaction.amount),
          date: normalizeDate(transaction.date),
          allocationMode: transaction.allocationMode ?? 'especifico',
          allocations: (transaction.allocations ?? []).map((allocation) => ({
            bucketId: allocation.bucketId,
            amount: Number(allocation.amount),
          })),
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar transacoes', error);
      this.transactionsSignal.set([]);
    }
  }

  private async refreshGoals(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.getGoals());

      this.goalsSignal.set(
        (response ?? []).map((goal) => ({
          ...goal,
          targetAmount: Number(goal.targetAmount),
          currentAmount: Number(goal.currentAmount),
          dueDate: normalizeDate(goal.dueDate),
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar metas', error);
      this.goalsSignal.set([]);
    }
  }

  async loadSalaryConfig(): Promise<SalaryConfig> {
    try {
      const response = await firstValueFrom(this.api.getSalaryConfig());
      return response;
    } catch (error) {
      console.error('Erro ao carregar configuração de salário', error);
      return {
        id: 1,
        isEnabled: false,
        amount: 0,
        description: 'Salário automático',
        businessDay: 5,
        lastProcessedMonth: 0,
      };
    }
  }

  async updateSalaryConfig(config: Omit<SalaryConfig, 'id'> & { id?: number }): Promise<void> {
    try {
      await firstValueFrom(this.api.updateSalaryConfig(config));
    } catch (error) {
      console.error('Erro ao atualizar configuração de salário', error);
      throw error;
    }
  }

  async processAutomaticSalary(): Promise<void> {
    try {
      await firstValueFrom(this.api.processAutomaticSalary());
    } catch (error) {
      console.error('Erro ao processar salário automático', error);
      throw error;
    }
  }

  async refreshTransactionsPublic(): Promise<void> {
    return this.refreshTransactions();
  }
}
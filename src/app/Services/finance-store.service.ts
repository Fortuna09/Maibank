import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FinanceApiService } from './finance-api.service';
import {
  AllocationBucket,
  AllocationBucketId,
  AllocationSettings,
  CreateGoalPayload,
  CreateTransactionPayload,
  CreditConfig,
  FinanceGoal,
  FinanceTransaction,
  TransactionType,
  AllocationMode,
  DEFAULT_ALLOCATION_SETTINGS,
  SalaryConfig,
  SalaryProcessResult,
} from '../Models/finance.model';
import {
  buildPercentageAllocations,
  buildSpecificAllocation,
  createBucketMap,
  normalizeDate,
  normalizeSettings,
  roundCurrency,
} from '../Utils/finance.utils';
import { buildInvoices, CreditInvoice, DEFAULT_CREDIT_CONFIG } from '../Utils/credit.utils';

export * from '../Models/finance.model';

@Injectable({
  providedIn: 'root',
})
export class FinanceStoreService {
  private readonly api = inject(FinanceApiService);

  private readonly transactionsSignal = signal<FinanceTransaction[]>([]);
  private readonly goalsSignal = signal<FinanceGoal[]>([]);
  private readonly settingsSignal = signal<AllocationSettings>(DEFAULT_ALLOCATION_SETTINGS);
  private readonly creditConfigSignal = signal<CreditConfig>(DEFAULT_CREDIT_CONFIG);

  readonly transactions = this.transactionsSignal.asReadonly();
  readonly goals = this.goalsSignal.asReadonly();
  readonly settings = this.settingsSignal.asReadonly();
  readonly creditConfig = this.creditConfigSignal.asReadonly();

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

  // Crédito não entra aqui: só vira saída de verdade quando a fatura é paga.
  readonly saldoAtual = computed(() => this.totalEntradas() - this.totalSaidas());

  readonly invoices = computed<CreditInvoice[]>(() =>
    buildInvoices(this.transactionsSignal(), this.creditConfigSignal())
  );

  readonly openInvoice = computed<CreditInvoice | null>(
    () => this.invoices().find((invoice) => invoice.status === 'aberta') ?? null
  );

  /** Faturas fechadas ainda não pagas (inclui vencidas). */
  readonly pendingInvoices = computed<CreditInvoice[]>(() =>
    this.invoices().filter((invoice) => invoice.status === 'fechada' || invoice.status === 'vencida')
  );

  /** Parcelas que ainda vão cair em faturas futuras. */
  readonly committedAhead = computed(() =>
    this.invoices()
      .filter((invoice) => invoice.status === 'futura')
      .reduce((total, invoice) => total + invoice.total, 0)
  );

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

  addTransaction(payload: CreateTransactionPayload): Promise<void> {
    const normalizedAmount = Number(payload.amount);
    const isCredit = payload.type === 'credito';
    const direction = payload.type === 'entrada' ? 1 : -1;
    const allocations = isCredit
      ? []
      : payload.allocationMode === 'percentual'
        ? buildPercentageAllocations(normalizedAmount * direction, this.settingsSignal().buckets)
        : buildSpecificAllocation(normalizedAmount * direction, payload.bucketId);

    if (!isCredit && allocations.length === 0) {
      return Promise.reject(new Error('Selecione um destino válido para o lançamento.'));
    }

    return firstValueFrom(
      this.api.createTransaction({
        description: payload.description,
        type: payload.type,
        amount: normalizedAmount,
        category: payload.category,
        date: payload.date,
        allocationMode: payload.allocationMode,
        allocations,
        installments: isCredit ? Math.max(1, Math.round(payload.installments ?? 1)) : 1,
        paidInvoice: payload.type === 'saida' ? payload.paidInvoice ?? null : null,
      })
    )
      .then(() => {
        this.refreshTransactions();
      })
      .catch((error) => {
        console.error('Erro ao criar transacao', error);
        throw error;
      });
  }

  removeTransaction(transactionId: string): Promise<void> {
    return firstValueFrom(this.api.deleteTransaction(transactionId))
      .then(() => {
        this.refreshTransactions();
      })
      .catch((error) => {
        console.error('Erro ao remover transacao', error);
        throw error;
      });
  }

  addGoal(payload: CreateGoalPayload): Promise<void> {
    return firstValueFrom(this.api.createGoal(payload))
      .then(() => {
        this.refreshGoals();
      })
      .catch((error) => {
        console.error('Erro ao criar meta', error);
        throw error;
      });
  }

  updateGoalProgress(goalId: string, amountToAdd: number): Promise<void> {
    const goal = this.goalsSignal().find((currentGoal) => currentGoal.id === goalId);
    const amount = Number(amountToAdd);
    if (!goal || !Number.isFinite(amount) || amount <= 0) {
      return Promise.reject(new Error('Informe um valor maior que zero.'));
    }

    const previousGoals = this.goalsSignal();
    this.goalsSignal.set(
      previousGoals.map((currentGoal) =>
        currentGoal.id === goalId
          ? { ...currentGoal, currentAmount: currentGoal.currentAmount + amount }
          : currentGoal
      )
    );

    return firstValueFrom(this.api.addGoalContribution(goalId, amount))
      .then(() => this.refreshGoals())
      .catch((error) => {
        console.error('Erro ao adicionar valor à meta', error);
        this.goalsSignal.set(previousGoals);
        throw error;
      });
  }

  updateGoal(goalId: string, payload: Omit<FinanceGoal, 'id'>): Promise<void> {
    const previousGoals = this.goalsSignal();
    const updatedGoal: FinanceGoal = { id: goalId, ...payload };
    this.goalsSignal.set(previousGoals.map((goal) => (goal.id === goalId ? updatedGoal : goal)));

    return firstValueFrom(this.api.updateGoal(goalId, payload))
      .then(() => this.refreshGoals())
      .catch((error) => {
        console.error('Erro ao atualizar meta', error);
        this.goalsSignal.set(previousGoals);
        throw error;
      });
  }

  /** Salva renda base e a lista completa de divisões (novas, alteradas e removidas) de uma vez. */
  updateAllocationSettings(settings: AllocationSettings): Promise<void> {
    const normalizedBuckets = settings.buckets.map((bucket) => ({
      ...bucket,
      percentage: Math.max(0, Number(bucket.percentage)),
    }));

    const total = normalizedBuckets.reduce((sum, bucket) => sum + bucket.percentage, 0);
    if (Math.round(total) !== 100) {
      return Promise.reject(new Error('A soma dos percentuais precisa ser 100.'));
    }

    const previousSettings = this.settingsSignal();
    const nextSettings: AllocationSettings = {
      baseIncome: Math.max(0, Number(settings.baseIncome)),
      buckets: normalizedBuckets,
    };

    this.settingsSignal.set(nextSettings);

    return firstValueFrom(this.api.updateSettings(nextSettings))
      .then(() => this.refreshSettings())
      .catch((error) => {
        console.error('Erro ao atualizar configuracoes', error);
        this.settingsSignal.set(previousSettings);
        throw error;
      });
  }

  removeGoal(goalId: string): Promise<void> {
    return firstValueFrom(this.api.deleteGoal(goalId))
      .then(() => {
        this.refreshGoals();
      })
      .catch((error) => {
        console.error('Erro ao remover meta', error);
        throw error;
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
      } else if (transaction.type === 'saida') {
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
    await Promise.all([this.refreshSettings(), this.refreshTransactions(), this.refreshGoals(), this.refreshCreditConfig()]);
    await this.runScheduledSalary();
  }

  private async runScheduledSalary(): Promise<void> {
    try {
      const result = await firstValueFrom(this.api.processAutomaticSalary());
      if (result.processed) {
        await this.refreshTransactions();
      }
    } catch (error) {
      console.error('Erro ao verificar salário automático', error);
    }
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
          installments: Math.max(1, Number(transaction.installments ?? 1)),
          paidInvoice: transaction.paidInvoice ?? null,
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

  private async refreshCreditConfig(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.getCreditConfig());
      this.creditConfigSignal.set({
        id: response.id,
        closingDay: Number(response.closingDay),
        dueDay: Number(response.dueDay),
      });
    } catch (error) {
      console.error('Erro ao carregar configuração de crédito', error);
      this.creditConfigSignal.set(DEFAULT_CREDIT_CONFIG);
    }
  }

  async updateCreditConfig(config: Omit<CreditConfig, 'id'>): Promise<void> {
    try {
      await firstValueFrom(this.api.updateCreditConfig(config));
      await this.refreshCreditConfig();
    } catch (error) {
      console.error('Erro ao atualizar configuração de crédito', error);
      throw error;
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
        payDay: 5,
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

  async processAutomaticSalary(): Promise<SalaryProcessResult> {
    try {
      return await firstValueFrom(this.api.processAutomaticSalary());
    } catch (error) {
      console.error('Erro ao processar salário automático', error);
      throw error;
    }
  }

  async refreshTransactionsPublic(): Promise<void> {
    return this.refreshTransactions();
  }
}
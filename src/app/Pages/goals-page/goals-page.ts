import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../Components/icon/icon';
import { GoalSaveFrequency } from '../../Models/finance.model';
import { FeedbackService } from '../../Services/feedback.service';
import { FinanceGoal, FinanceStoreService } from '../../Services/finance-store.service';
import { categoryIcon, todayLocalIso } from '../../Utils/finance.utils';

@Component({
  selector: 'app-goals-page',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe, Icon],
  templateUrl: './goals-page.html',
  styleUrl: './goals-page.scss',
})
export class GoalsPage {
  readonly financeStore = inject(FinanceStoreService);
  private readonly feedback = inject(FeedbackService);

  /** Qual ação está em andamento ('new', 'contrib:<id>', 'delete:<id>') — controla o spinner do botão certo. */
  readonly busyKey = signal<string | null>(null);

  iconFor(label: string): string {
    return categoryIcon(label);
  }

  title = '';
  currentAmount = 0;
  targetAmount = 0;
  saveAmount = 0;
  saveFrequency: GoalSaveFrequency = 'mensal';
  dueDate: string | null = '';
  progressInputByGoalId: Record<string, number> = {};
  editGoalById: Record<string, { title: string; targetAmount: number; currentAmount: number; dueDate: string | null; saveAmount: number; saveFrequency: GoalSaveFrequency }> = {};
  openGoalActionsById: Record<string, boolean> = {};
  showContributionById: Record<string, boolean> = {};
  confirmingGoalId: string | null = null;

  // UI state: keep editors hidden by default
  showEditors = false;

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  toggleEditors(): void {
    this.showEditors = !this.showEditors;
    this.saveError.set(null);
  }

  addGoal(): void {
    const title = this.title.trim();
    if (!title || this.targetAmount <= 0 || this.currentAmount < 0 || this.saveAmount <= 0) {
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.busyKey.set('new');

    this.feedback
      .run(
        () =>
          this.financeStore.addGoal({
            title,
            targetAmount: Number(this.targetAmount),
            currentAmount: Number(this.currentAmount),
            dueDate: this.dueDate || null,
            saveAmount: this.saveAmount,
            saveFrequency: this.saveFrequency,
            createdAt: todayLocalIso(),
          }),
        { success: 'Meta criada' }
      )
      .then(() => {
        this.title = '';
        this.currentAmount = 0;
        this.targetAmount = 0;
        this.saveAmount = 0;
        this.saveFrequency = 'mensal';
        this.dueDate = '';
        this.showEditors = false;
      })
      .catch(() => {
        this.saveError.set('Não foi possível salvar a meta. Verifique se o servidor está rodando e tente novamente.');
      })
      .finally(() => {
        this.saving.set(false);
        this.busyKey.set(null);
      });
  }

  toggleGoalActions(goalId: string): void {
    this.openGoalActionsById[goalId] = !this.openGoalActionsById[goalId];
    if (!this.openGoalActionsById[goalId]) {
      this.confirmingGoalId = null;
    }
  }

  requestGoalRemoval(goalId: string): void {
    this.confirmingGoalId = goalId;
  }

  cancelGoalRemoval(): void {
    this.confirmingGoalId = null;
  }

  removeGoal(goalId: string): void {
    this.busyKey.set(`delete:${goalId}`);
    this.feedback
      .run(() => this.financeStore.removeGoal(goalId), {
        success: 'Meta excluída',
        error: 'Não foi possível excluir a meta. Tente novamente.',
      })
      .then(() => {
        delete this.openGoalActionsById[goalId];
        this.confirmingGoalId = null;
      })
      .catch(() => undefined)
      .finally(() => this.busyKey.set(null));
  }

  applyGoalProgress(goal: FinanceGoal): void {
    const amount = Number(this.progressInputByGoalId[goal.id] ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.busyKey.set(`contrib:${goal.id}`);
    this.feedback
      .run(() => this.financeStore.updateGoalProgress(goal.id, amount), {
        success: 'Valor adicionado à meta',
        error: 'Não foi possível adicionar o valor. Tente novamente.',
      })
      .then(() => {
        this.progressInputByGoalId[goal.id] = 0;
        this.showContributionById[goal.id] = false;
      })
      .catch(() => undefined)
      .finally(() => this.busyKey.set(null));
  }

  toggleContribution(goalId: string): void {
    this.showContributionById[goalId] = !this.showContributionById[goalId];
  }

  ensureGoalEditState(goal: FinanceGoal): void {
    if (this.editGoalById[goal.id]) {
      return;
    }

    this.editGoalById[goal.id] = {
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      dueDate: goal.dueDate,
      saveAmount: goal.saveAmount,
      saveFrequency: goal.saveFrequency,
    };
  }

  getGoalEditor(goal: FinanceGoal): { title: string; targetAmount: number; currentAmount: number; dueDate: string | null; saveAmount: number; saveFrequency: GoalSaveFrequency } {
    this.ensureGoalEditState(goal);
    return this.editGoalById[goal.id];
  }

  saveGoal(goal: FinanceGoal): void {
    this.ensureGoalEditState(goal);
    const goalData = this.editGoalById[goal.id];

    if (!goalData.title || goalData.targetAmount <= 0 || goalData.currentAmount < 0 || goalData.saveAmount <= 0) {
      return;
    }

    void this.feedback
      .run(
        () =>
          this.financeStore.updateGoal(goal.id, {
            title: goalData.title,
            targetAmount: Number(goalData.targetAmount),
            currentAmount: Number(goalData.currentAmount),
            dueDate: goalData.dueDate || null,
            saveAmount: Number(goalData.saveAmount),
            saveFrequency: goalData.saveFrequency,
            createdAt: goal.createdAt,
          }),
        { success: 'Meta atualizada', error: 'Não foi possível atualizar a meta.' }
      )
      .catch(() => undefined);
  }
}

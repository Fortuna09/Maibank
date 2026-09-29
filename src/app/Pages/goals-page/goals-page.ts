import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../Components/icon/icon';
import { GoalSaveFrequency } from '../../Models/finance.model';
import { apiErrorMessage } from '../../Services/auth.service';
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
  // null = campo em branco (mostra o "0,00" do placeholder)
  currentAmount: number | null = null;
  targetAmount: number | null = null;
  saveAmount: number | null = null;
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

  /**
   * Só nome e valor da meta são obrigatórios. "Já guardado" e "quanto guardar por vez" podem
   * ficar em branco (viram zero) — tem quem guarde sem valor fixo, ou a cada trimestre.
   */
  private goalError(title: string, target: number | null, current: number | null, save: number | null): string | null {
    if (!title) {
      return 'Dê um nome para a meta.';
    }
    if (target == null || !(Number(target) > 0)) {
      return 'Informe o valor da meta (maior que zero).';
    }
    if (Number(current ?? 0) < 0 || Number(save ?? 0) < 0) {
      return 'Os valores não podem ser negativos.';
    }
    return null;
  }

  addGoal(): void {
    const title = this.title.trim();
    const invalid = this.goalError(title, this.targetAmount, this.currentAmount, this.saveAmount);
    if (invalid) {
      this.saveError.set(invalid);
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
            currentAmount: Number(this.currentAmount ?? 0),
            dueDate: this.dueDate || null,
            saveAmount: Number(this.saveAmount ?? 0),
            saveFrequency: this.saveFrequency,
            createdAt: todayLocalIso(),
          }),
        { success: 'Meta criada' }
      )
      .then(() => {
        this.title = '';
        this.currentAmount = null;
        this.targetAmount = null;
        this.saveAmount = null;
        this.saveFrequency = 'mensal';
        this.dueDate = '';
        this.showEditors = false;
      })
      .catch((error) => {
        this.saveError.set(apiErrorMessage(error, 'Não foi possível salvar a meta. Tente de novo.'));
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

    if (this.goalError(goalData.title.trim(), goalData.targetAmount, goalData.currentAmount, goalData.saveAmount)) {
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

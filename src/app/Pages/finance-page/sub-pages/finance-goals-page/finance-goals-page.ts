import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GoalSaveFrequency } from '../../../../Models/finance.model';
import { FinanceGoal, FinanceStoreService } from '../../../../Services/finance-store.service';

@Component({
  selector: 'app-finance-goals-page',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe],
  templateUrl: './finance-goals-page.html',
  styleUrl: './finance-goals-page.scss',
})
export class FinanceGoalsPage {
  readonly financeStore = inject(FinanceStoreService);

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

  toggleEditors(): void {
    this.showEditors = !this.showEditors;
  }

  addGoal(): void {
    const title = this.title.trim();
    if (!title || this.targetAmount <= 0 || this.currentAmount < 0 || this.saveAmount <= 0) {
      return;
    }

    this.financeStore.addGoal({
      title,
      targetAmount: Number(this.targetAmount),
      currentAmount: Number(this.currentAmount),
      dueDate: this.dueDate || null,
      saveAmount: this.saveAmount,
      saveFrequency: this.saveFrequency,
      createdAt: new Date().toISOString().slice(0, 10),
    });

    this.title = '';
    this.currentAmount = 0;
    this.targetAmount = 0;
    this.saveAmount = 0;
    this.saveFrequency = 'mensal';
    this.dueDate = '';
    this.showEditors = false;
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
    this.financeStore.removeGoal(goalId);
    delete this.openGoalActionsById[goalId];
    this.confirmingGoalId = null;
  }

  applyGoalProgress(goal: FinanceGoal): void {
    const amount = Number(this.progressInputByGoalId[goal.id] ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.financeStore.updateGoalProgress(goal.id, amount);
    this.progressInputByGoalId[goal.id] = 0;
    this.showContributionById[goal.id] = false;
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

    this.financeStore.updateGoal(goal.id, {
      title: goalData.title,
      targetAmount: Number(goalData.targetAmount),
      currentAmount: Number(goalData.currentAmount),
      dueDate: goalData.dueDate || null,
      saveAmount: Number(goalData.saveAmount),
      saveFrequency: goalData.saveFrequency,
      createdAt: goal.createdAt,
    });
  }
}

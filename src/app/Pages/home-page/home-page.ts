import { CurrencyPipe, NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavBar } from '../../Components/nav-bar/nav-bar';
import { FinanceStoreService } from '../../Services/finance-store.service';

@Component({
  selector: 'app-home-page',
  imports: [NavBar, RouterLink, CurrencyPipe, NgIf],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  readonly financeStore = inject(FinanceStoreService);

  readonly currentMonthExpenses = computed(() => this.getCurrentMonthTotal('saida'));
  readonly currentMonthIncome = computed(() => this.getCurrentMonthTotal('entrada'));
  readonly activeGoal = computed(
    () => this.financeStore.goals().find((goal) => goal.currentAmount < goal.targetAmount) ?? null
  );
  readonly activeGoalProgress = computed(() => {
    const goal = this.activeGoal();
    return goal ? this.financeStore.getGoalProgress(goal) : 100;
  });
  readonly monthlyStatus = computed(() => {
    const income = this.currentMonthIncome();
    const expenses = this.currentMonthExpenses();

    if (income === 0 && expenses === 0) {
      return 'Nenhum lançamento registrado neste mês.';
    }

    if (income >= expenses) {
      return 'As entradas cobrem as despesas deste mês.';
    }

    return 'As despesas estão acima das entradas deste mês.';
  });

  private getCurrentMonthTotal(type: 'entrada' | 'saida'): number {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return this.financeStore
      .transactions()
      .filter((transaction) => {
        const date = new Date(`${transaction.date}T00:00:00`);
        return transaction.type === type && date.getMonth() === month && date.getFullYear() === year;
      })
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

}

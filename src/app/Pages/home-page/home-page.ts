import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../Components/icon/icon';
import { AppearanceService } from '../../Services/appearance.service';
import { AuthService } from '../../Services/auth.service';
import { FinanceGoal, FinanceStoreService, FinanceTransaction } from '../../Services/finance-store.service';
import { TransactionModalService } from '../../Services/transaction-modal.service';
import { categoryIcon, transactionIcon } from '../../Utils/finance.utils';

@Component({
  selector: 'app-home-page',
  imports: [Icon, RouterLink, CurrencyPipe, DatePipe, NgFor, NgIf],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit, OnDestroy {
  readonly financeStore = inject(FinanceStoreService);
  readonly appearance = inject(AppearanceService);
  private readonly auth = inject(AuthService);
  readonly modal = inject(TransactionModalService);
  readonly isPrivacyMode = signal(false);
  readonly today = new Date();

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const name = this.appearance.userName() || this.auth.firstName();
    return name ? `${period}, ${name}` : period;
  });

  readonly dailyBucket = computed(() => {
    const buckets = this.financeStore.settings().buckets;
    const normalize = (value: string) =>
      value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    const match =
      buckets.find((bucket) => bucket.id === 'uso-diario') ??
      buckets.find((bucket) => /uso|diari/.test(normalize(bucket.label)));

    if (!match) {
      return null;
    }

    return {
      label: match.label,
      amount: this.financeStore.bucketBalances()[match.id] ?? 0,
    };
  });

  readonly goals = computed<FinanceGoal[]>(() => this.financeStore.goals());

  readonly goalIndex = signal(0);
  readonly currentGoal = computed(() => {
    const goals = this.goals();
    return goals.length ? goals[this.goalIndex() % goals.length] : null;
  });

  readonly recentTransactions = computed<FinanceTransaction[]>(() =>
    [...this.financeStore.transactions()]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 3)
  );

  private carouselTimer?: number;

  ngOnInit(): void {
    this.isPrivacyMode.set(localStorage.getItem('maibank-privacy-mode') === 'true');
    this.carouselTimer = window.setInterval(() => this.nextGoal(), 6000);
  }

  ngOnDestroy(): void {
    if (this.carouselTimer) {
      window.clearInterval(this.carouselTimer);
    }
  }

  nextGoal(): void {
    const total = this.goals().length;
    if (total > 1) {
      this.goalIndex.update((index) => (index + 1) % total);
    }
  }

  previousGoal(): void {
    const total = this.goals().length;
    if (total > 1) {
      this.goalIndex.update((index) => (index - 1 + total) % total);
    }
  }

  togglePrivacyMode(): void {
    const nextValue = !this.isPrivacyMode();
    this.isPrivacyMode.set(nextValue);
    localStorage.setItem('maibank-privacy-mode', String(nextValue));
  }

  iconFor(label: string): string {
    return categoryIcon(label);
  }

  typeIcon(transaction: FinanceTransaction): string {
    return transactionIcon(transaction.type);
  }

  goalRemaining(goal: FinanceGoal): number {
    return this.financeStore.getGoalForecast(goal).remainingAmount;
  }

  goalForecast(goal: FinanceGoal): string {
    return this.financeStore.getGoalForecast(goal).statusText;
  }
}

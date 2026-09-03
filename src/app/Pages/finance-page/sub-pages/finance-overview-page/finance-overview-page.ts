import { CurrencyPipe, NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FinanceStoreService, FinanceTransaction } from '../../../../Services/finance-store.service';

@Component({
  selector: 'app-finance-overview-page',
  imports: [CurrencyPipe, NgFor],
  templateUrl: './finance-overview-page.html',
  styleUrl: './finance-overview-page.scss',
})
export class FinanceOverviewPage {
  readonly financeStore = inject(FinanceStoreService);
  private readonly bucketColors = ['#8ca8c9', '#d7b98f', '#9fc5b8', '#d7b0c5'];

  bucketColor(index: number): string {
    return this.bucketColors[index % this.bucketColors.length];
  }

  bucketSummaryRows(): Array<{ label: string; amount: number }> {
    return this.financeStore.settings().buckets.map((bucket) => ({
      label: bucket.label,
      amount: this.financeStore.bucketBalances()[bucket.id] ?? 0,
    }));
  }

  lastTransactions(): FinanceTransaction[] {
    return [...this.financeStore.transactions()]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 10);
  }
}

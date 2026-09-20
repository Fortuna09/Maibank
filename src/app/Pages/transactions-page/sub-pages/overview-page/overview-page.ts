import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../Components/icon/icon';
import { FinanceStoreService, FinanceTransaction } from '../../../../Services/finance-store.service';
import { TransactionModalService } from '../../../../Services/transaction-modal.service';
import { categoryIcon, transactionIcon } from '../../../../Utils/finance.utils';

@Component({
  selector: 'app-overview-page',
  imports: [CurrencyPipe, NgFor, NgIf, Icon, RouterLink],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.scss',
})
export class OverviewPage {
  readonly financeStore = inject(FinanceStoreService);
  readonly modal = inject(TransactionModalService);
  private readonly bucketColors = ['#8ca8c9', '#d7b98f', '#9fc5b8', '#d7b0c5'];

  bucketColor(index: number): string {
    return this.bucketColors[index % this.bucketColors.length];
  }

  iconFor(label: string): string {
    return categoryIcon(label);
  }

  typeIcon(transaction: FinanceTransaction): string {
    return transactionIcon(transaction.type);
  }

  bucketSummaryRows(): Array<{ label: string; amount: number; share: number }> {
    const balances = this.financeStore.bucketBalances();
    const buckets = this.financeStore.settings().buckets;
    const total = buckets.reduce((sum, bucket) => sum + Math.max(0, balances[bucket.id] ?? 0), 0);

    return buckets.map((bucket) => {
      const amount = balances[bucket.id] ?? 0;
      return {
        label: bucket.label,
        amount,
        share: total > 0 ? Math.round((Math.max(0, amount) / total) * 100) : 0,
      };
    });
  }

  lastTransactions(): FinanceTransaction[] {
    return [...this.financeStore.transactions()]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 8);
  }
}

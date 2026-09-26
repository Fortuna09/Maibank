import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Icon } from '../../../../Components/icon/icon';
import { FeedbackService } from '../../../../Services/feedback.service';
import { FinanceStoreService, RecurringTransaction } from '../../../../Services/finance-store.service';
import { TransactionModalService } from '../../../../Services/transaction-modal.service';

/** Tudo que se repete todo mês: quanto entra e sai fixo, e quando cada um cai. */
@Component({
  selector: 'app-recurring-page',
  imports: [CurrencyPipe, DatePipe, Icon],
  templateUrl: './recurring-page.html',
  styleUrl: './recurring-page.scss',
})
export class RecurringPage {
  readonly financeStore = inject(FinanceStoreService);
  private readonly modal = inject(TransactionModalService);
  private readonly feedback = inject(FeedbackService);

  readonly confirmingId = signal<string | null>(null);
  readonly stoppingId = signal<string | null>(null);

  readonly monthlyIn = computed(() => this.sum('entrada'));
  readonly monthlyOut = computed(() => this.sum('saida'));
  readonly monthlyNet = computed(() => this.monthlyIn() - this.monthlyOut());

  destination(item: RecurringTransaction): string {
    return item.allocationMode === 'percentual' || !item.bucketId
      ? 'todas as divisões'
      : this.financeStore.getBucketLabel(item.bucketId);
  }

  openNew(): void {
    this.modal.open({ title: 'Novo lançamento recorrente', recurring: true });
  }

  stop(item: RecurringTransaction): void {
    this.stoppingId.set(item.id);
    this.feedback
      .run(() => this.financeStore.removeRecurring(item.id), {
        success: `"${item.description}" não se repete mais`,
        error: 'Não foi possível parar agora. Tente de novo.',
      })
      .catch(() => undefined)
      .finally(() => {
        this.stoppingId.set(null);
        this.confirmingId.set(null);
      });
  }

  private sum(type: 'entrada' | 'saida'): number {
    return this.financeStore
      .recurring()
      .filter((item) => item.type === type)
      .reduce((total, item) => total + item.amount, 0);
  }
}

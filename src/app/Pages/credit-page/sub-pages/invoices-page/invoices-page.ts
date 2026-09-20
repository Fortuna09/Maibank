import { CurrencyPipe, DatePipe, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../Components/icon/icon';
import { FinanceStoreService } from '../../../../Services/finance-store.service';
import { FeedbackService } from '../../../../Services/feedback.service';
import { TransactionModalService } from '../../../../Services/transaction-modal.service';
import { CreditInvoice, InvoiceStatus } from '../../../../Utils/credit.utils';
import { categoryIcon } from '../../../../Utils/finance.utils';

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  aberta: 'Aberta',
  fechada: 'Fechada',
  vencida: 'Vencida',
  paga: 'Paga',
  futura: 'Futura',
};

@Component({
  selector: 'app-invoices-page',
  imports: [NgFor, NgIf, NgTemplateOutlet, CurrencyPipe, DatePipe, RouterLink, Icon],
  templateUrl: './invoices-page.html',
  styleUrl: './invoices-page.scss',
})
export class InvoicesPage {
  readonly financeStore = inject(FinanceStoreService);
  readonly modal = inject(TransactionModalService);
  private readonly feedback = inject(FeedbackService);

  private readonly expandedOverrides = signal<Record<string, boolean>>({});
  readonly showPaid = signal(false);
  readonly deletingId = signal<string | null>(null);

  readonly pendingTotal = computed(() =>
    this.financeStore.pendingInvoices().reduce((total, invoice) => total + invoice.total, 0)
  );

  readonly hasOverdue = computed(() =>
    this.financeStore.pendingInvoices().some((invoice) => invoice.status === 'vencida')
  );

  /** Da mais urgente para a mais distante: vencidas, fechadas, aberta, futuras. */
  readonly activeInvoices = computed(() =>
    this.financeStore.invoices().filter((invoice) => invoice.status !== 'paga')
  );

  readonly paidInvoices = computed(() =>
    [...this.financeStore.invoices().filter((invoice) => invoice.status === 'paga')].reverse()
  );

  readonly hasAnyCredit = computed(() =>
    this.financeStore.transactions().some((transaction) => transaction.type === 'credito')
  );

  isExpanded(invoice: CreditInvoice): boolean {
    // A fatura aberta começa expandida; as outras, fechadas — até o usuário clicar.
    return this.expandedOverrides()[invoice.key] ?? invoice.status === 'aberta';
  }

  toggle(invoice: CreditInvoice): void {
    const next = !this.isExpanded(invoice);
    this.expandedOverrides.update((current) => ({ ...current, [invoice.key]: next }));
  }

  statusLabel(status: InvoiceStatus): string {
    return STATUS_LABEL[status];
  }

  iconFor(label: string): string {
    return categoryIcon(label);
  }

  openCreditModal(): void {
    this.modal.open({ title: 'Nova compra no crédito', type: 'credito' });
  }

  payInvoice(invoice: CreditInvoice): void {
    this.modal.open({
      title: `Pagar fatura de ${invoice.label}`,
      type: 'saida',
      lockType: true,
      description: `Fatura do cartão ${invoice.label}`,
      category: 'Cartão de crédito',
      amount: invoice.total,
      allocationMode: 'especifico',
      bucketId: 'uso-diario',
      paidInvoice: invoice.key,
      successMessage: `Fatura de ${invoice.label} paga`,
    });
  }

  deletePurchase(transactionId: string): void {
    this.deletingId.set(transactionId);
    this.feedback
      .run(() => this.financeStore.removeTransaction(transactionId), {
        success: 'Compra apagada',
        error: 'Não foi possível apagar a compra. Tente novamente.',
      })
      .catch(() => undefined)
      .finally(() => this.deletingId.set(null));
  }
}

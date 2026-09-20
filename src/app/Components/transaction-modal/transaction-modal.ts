import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';
import { AllocationBucketId, AllocationMode, FinanceStoreService, TransactionType } from '../../Services/finance-store.service';
import { FeedbackService } from '../../Services/feedback.service';
import { TransactionModalService } from '../../Services/transaction-modal.service';
import { closingDateFor, dueDateFor, invoiceLabel, monthKey, parseLocalDate } from '../../Utils/credit.utils';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-transaction-modal',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe, Icon],
  templateUrl: './transaction-modal.html',
  styleUrl: './transaction-modal.scss',
})
export class TransactionModal {
  readonly financeStore = inject(FinanceStoreService);
  readonly modal = inject(TransactionModalService);
  private readonly feedback = inject(FeedbackService);

  title = 'Novo lançamento';
  description = '';
  category = '';
  type: TransactionType = 'saida';
  allocationMode: AllocationMode = 'especifico';
  selectedBucketId: AllocationBucketId = 'uso-diario';
  amount = 0;
  date = today();
  installments = 1;
  paidInvoice: string | null = null;
  lockType = false;
  successMessage = 'Lançamento salvo';

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  // Só existe para os campos reagirem à mudança de tipo/data/parcelas no template.
  private readonly formVersion = signal(0);

  readonly invoiceHint = computed(() => {
    this.formVersion();
    if (this.type !== 'credito' || !this.date) {
      return null;
    }

    const config = this.financeStore.creditConfig();
    const purchaseDate = parseLocalDate(this.date);
    const count = Math.max(1, Math.round(this.installments || 1));
    const first = invoiceLabel(monthKey(dueDateFor(closingDateFor(purchaseDate, config), config)));

    if (count === 1) {
      return `Entra na fatura de ${first}`;
    }

    const last = invoiceLabel(monthKey(dueDateFor(closingDateFor(purchaseDate, config, count - 1), config)));
    return `${count} parcelas, de ${first} até ${last}`;
  });

  readonly installmentValue = computed(() => {
    this.formVersion();
    const count = Math.max(1, Math.round(this.installments || 1));
    return this.type === 'credito' && count > 1 ? this.amount / count : 0;
  });

  constructor() {
    effect(() => {
      if (this.modal.isOpen()) {
        this.applyPreset();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modal.isOpen() && !this.saving()) {
      this.close();
    }
  }

  touch(): void {
    this.formVersion.update((value) => value + 1);
  }

  close(): void {
    this.modal.close();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.saving()) {
      this.close();
    }
  }

  submit(): void {
    if (!this.description.trim() || !this.category.trim() || this.amount <= 0) {
      this.saveError.set('Preencha descrição, categoria e um valor maior que zero.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    this.feedback
      .run(
        () =>
          this.financeStore.addTransaction({
            description: this.description.trim(),
            type: this.type,
            amount: this.amount,
            category: this.category.trim(),
            date: this.date,
            allocationMode: this.type === 'credito' ? 'especifico' : this.allocationMode,
            bucketId: this.selectedBucketId,
            installments: this.installments,
            paidInvoice: this.paidInvoice,
          }),
        { success: this.successMessage }
      )
      .then(() => this.close())
      .catch(() => {
        this.saveError.set('Não foi possível salvar o lançamento. Verifique se o servidor está rodando e tente novamente.');
      })
      .finally(() => this.saving.set(false));
  }

  private applyPreset(): void {
    const preset = this.modal.preset();

    this.title = preset?.title ?? 'Novo lançamento';
    this.description = preset?.description ?? '';
    this.category = preset?.category ?? '';
    this.type = preset?.type ?? 'saida';
    this.allocationMode = preset?.allocationMode ?? 'especifico';
    this.selectedBucketId = preset?.bucketId ?? 'uso-diario';
    this.amount = preset?.amount ?? 0;
    this.date = preset?.date ?? today();
    this.installments = preset?.installments ?? 1;
    this.paidInvoice = preset?.paidInvoice ?? null;
    this.lockType = preset?.lockType ?? false;
    this.successMessage = preset?.successMessage ?? 'Lançamento salvo';

    this.saveError.set(null);
    this.touch();
  }
}

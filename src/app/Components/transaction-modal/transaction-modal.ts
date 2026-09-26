import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmountModeSwitch } from '../amount-mode-switch/amount-mode-switch';
import { Icon } from '../icon/icon';
import { AllocationBucketId, AllocationMode, FinanceStoreService, TransactionType } from '../../Services/finance-store.service';
import { FeedbackService } from '../../Services/feedback.service';
import { TransactionModalService } from '../../Services/transaction-modal.service';
import { closingDateFor, dueDateFor, invoiceLabel, monthKey, parseLocalDate } from '../../Utils/credit.utils';
import { AmountMode, installmentFromTotal, todayLocalIso, totalFromInstallment } from '../../Utils/finance.utils';

function today(): string {
  return todayLocalIso();
}

@Component({
  selector: 'app-transaction-modal',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe, Icon, AmountModeSwitch],
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
  amount: number | null = null;
  /** No crédito dá para digitar só a parcela; o total vira parcela × quantidade. */
  amountMode: AmountMode = 'total';
  installmentAmount: number | null = null;
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

  /** Valor que vai para o banco: o digitado, ou parcela × quantidade no modo parcela. */
  readonly total = computed(() => {
    this.formVersion();
    return this.usesInstallmentInput() ? totalFromInstallment(this.installmentAmount ?? 0, this.installments) : Number(this.amount) || 0;
  });

  /** A conta do outro lado: quanto dá cada parcela, ou quanto dá o total. */
  readonly derivedValue = computed(() => {
    this.formVersion();
    const count = Math.max(1, Math.round(this.installments || 1));
    if (this.type !== 'credito' || count < 2 || this.total() <= 0) {
      return null;
    }

    return this.amountMode === 'parcela'
      ? { label: 'Total a pagar', value: this.total() }
      : { label: 'Cada parcela', value: installmentFromTotal(this.amount ?? 0, count) };
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

  setType(type: TransactionType): void {
    // Saindo do crédito, o valor digitado como parcela vira o total.
    if (this.type === 'credito' && type !== 'credito' && this.amountMode === 'parcela') {
      this.amount = this.total() || null;
      this.amountMode = 'total';
    }
    this.type = type;
    this.touch();
  }

  /** Troca o modo levando junto o que já foi digitado, para não precisar redigitar. */
  setAmountMode(mode: AmountMode): void {
    if (mode === 'parcela') {
      this.installmentAmount = this.amount ? installmentFromTotal(this.amount, this.installments) : null;
    } else {
      this.amount = this.total() || null;
    }
    this.amountMode = mode;
    this.touch();
  }

  private usesInstallmentInput(): boolean {
    return this.type === 'credito' && this.amountMode === 'parcela';
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
    const total = this.total();
    if (!this.description.trim() || !this.category.trim() || total <= 0) {
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
            amount: total,
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
    this.amount = preset?.amount ?? null;
    this.amountMode = 'total';
    this.installmentAmount = null;
    this.date = preset?.date ?? today();
    this.installments = preset?.installments ?? 1;
    this.paidInvoice = preset?.paidInvoice ?? null;
    this.lockType = preset?.lockType ?? false;
    this.successMessage = preset?.successMessage ?? 'Lançamento salvo';

    this.saveError.set(null);
    this.touch();
  }
}

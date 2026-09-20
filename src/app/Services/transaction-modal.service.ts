import { Injectable, signal } from '@angular/core';
import { AllocationBucketId, AllocationMode, TransactionType } from '../Models/finance.model';

/** Valores iniciais opcionais para abrir o modal já preenchido (ex.: pagar uma fatura). */
export interface TransactionPreset {
  title?: string;
  type?: TransactionType;
  description?: string;
  category?: string;
  amount?: number;
  date?: string;
  allocationMode?: AllocationMode;
  bucketId?: AllocationBucketId;
  installments?: number;
  paidInvoice?: string | null;
  /** Trava o tipo quando o contexto já define (ex.: pagamento de fatura é sempre saída). */
  lockType?: boolean;
  /** Texto do toast ao salvar; padrão "Lançamento salvo". */
  successMessage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionModalService {
  readonly isOpen = signal(false);
  readonly preset = signal<TransactionPreset | null>(null);

  open(preset?: TransactionPreset): void {
    this.preset.set(preset ?? null);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}

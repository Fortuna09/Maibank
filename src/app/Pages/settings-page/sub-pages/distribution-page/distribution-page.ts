import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, NgFor, NgIf, DecimalPipe } from '@angular/common';
import { Icon } from '../../../../Components/icon/icon';
import { FeedbackService } from '../../../../Services/feedback.service';
import { FinanceStoreService, AllocationBucket } from '../../../../Services/finance-store.service';
import { categoryIcon, makeBucketId, normalizeAllocationPercentages } from '../../../../Utils/finance.utils';

@Component({
  selector: 'app-distribution-page',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe, DecimalPipe, Icon],
  templateUrl: './distribution-page.html',
  styleUrl: './distribution-page.scss',
})
export class DistributionPage {
  readonly financeStore = inject(FinanceStoreService);
  private readonly feedback = inject(FeedbackService);

  readonly saving = signal(false);

  isEditingOrcamento = false;
  isShowingValidationAlert = false;
  validationMessage = '';
  validationIsError = false;
  draftIncomeBase = 0;
  draftBuckets: Array<{ id: string; label: string; percentage: number; amount: number }> = [];
  newBucketLabel = '';
  expandedBucketIndex: number | null = null;
  isAddingBucket = false;
  isEditingIncomeBase = false;

  iconFor(label: string): string {
    return categoryIcon(label);
  }

  openOrcamentoEditor(): void {
    this.draftIncomeBase = this.financeStore.settings().baseIncome;
    this.draftBuckets = this.financeStore.settings().buckets.map((b) => ({
      id: b.id,
      label: b.label,
      percentage: b.percentage,
      amount: Number(((b.percentage / 100) * this.draftIncomeBase).toFixed(2)),
    }));
    this.isEditingOrcamento = true;
    this.isEditingIncomeBase = false;
  }

  closeOrcamentoEditor(): void {
    this.isEditingOrcamento = false;
    this.newBucketLabel = '';
    this.isShowingValidationAlert = false;
    this.isEditingIncomeBase = false;
  }

  toggleIncomeBaseEdit(): void {
    this.isEditingIncomeBase = !this.isEditingIncomeBase;
  }

  onDraftIncomeChange(): void {
    this.draftBuckets.forEach((b) => {
      b.amount = Number(((b.percentage / 100) * this.draftIncomeBase).toFixed(2));
    });
  }

  onDraftPercentageChange(index: number): void {
    const b = this.draftBuckets[index];
    b.percentage = Number(Math.min(Math.max(b.percentage, 0), 100).toFixed(2));
    b.amount = Number(((b.percentage / 100) * this.draftIncomeBase).toFixed(2));
  }

  onSliderChange(index: number, value: number): void {
    const target = this.draftBuckets[index];
    const nextValue = Number(Math.min(Math.max(value, 0), 100).toFixed(2));
    const others = this.draftBuckets.filter((_, i) => i !== index);
    const otherTotal = others.reduce((sum, b) => sum + Number(b.percentage || 0), 0);

    target.percentage = nextValue;
    target.amount = Number(((target.percentage / 100) * this.draftIncomeBase).toFixed(2));

    if (!others.length) {
      return;
    }

    const remaining = Math.max(100 - nextValue, 0);
    const keepWeight = otherTotal > 0 ? remaining / otherTotal : 0;

    others.forEach((bucket) => {
      const original = Number(bucket.percentage || 0);
      const recalculated = Number((original * keepWeight).toFixed(2));
      bucket.percentage = recalculated;
      bucket.amount = Number(((bucket.percentage / 100) * this.draftIncomeBase).toFixed(2));
    });

    const finalTotal = this.draftBuckets.reduce((sum, b) => sum + Number(b.percentage || 0), 0);
    if (finalTotal !== 100 && others.length > 0) {
      const lastBucket = others[others.length - 1];
      const difference = Number((100 - finalTotal).toFixed(2));
      lastBucket.percentage = Number((Number(lastBucket.percentage || 0) + difference).toFixed(2));
      lastBucket.amount = Number(((lastBucket.percentage / 100) * this.draftIncomeBase).toFixed(2));
    }
  }

  onDraftAmountChange(index: number): void {
    const b = this.draftBuckets[index];
    if (this.draftIncomeBase > 0) {
      b.percentage = Number(((b.amount / this.draftIncomeBase) * 100).toFixed(2));
    } else {
      b.percentage = 0;
    }
  }

  addDraftBucket(): void {
    if (!this.newBucketLabel.trim()) return;
    this.draftBuckets.push({
      id: 'new-' + Date.now(),
      label: this.newBucketLabel.trim(),
      percentage: 0,
      amount: 0,
    });
    this.newBucketLabel = '';
    this.isAddingBucket = false;
    this.expandedBucketIndex = this.draftBuckets.length - 1;
  }

  toggleAddBucket(): void {
    this.isAddingBucket = !this.isAddingBucket;
    if (!this.isAddingBucket) {
      this.newBucketLabel = '';
    }
  }

  toggleDraftBucket(index: number): void {
    this.expandedBucketIndex = this.expandedBucketIndex === index ? null : index;
  }

  removeDraftBucket(index: number): void {
    this.draftBuckets.splice(index, 1);
    if (this.expandedBucketIndex === index) {
      this.expandedBucketIndex = null;
    } else if (this.expandedBucketIndex !== null && this.expandedBucketIndex > index) {
      this.expandedBucketIndex -= 1;
    }
  }

  get draftTotalPercentage(): number {
    return this.draftBuckets.reduce((sum, b) => sum + Number(b.percentage), 0);
  }

  isPercentageOverLimit(): boolean {
    return this.draftTotalPercentage > 100.1;
  }

  saveOrcamentoDraft(): void {
    const total = this.draftTotalPercentage;

    if (this.isPercentageOverLimit()) {
      return;
    }

    if (this.draftBuckets.length === 0) {
      this.validationIsError = true;
      this.validationMessage = 'Você precisa ter pelo menos uma divisão.';
      this.isShowingValidationAlert = true;
      return;
    }

    if (total < 99.9) {
      const result = normalizeAllocationPercentages(
        this.draftBuckets.map((b) => ({ id: b.id, label: b.label, percentage: b.percentage })),
        'uso-diario'
      );

      if (result.wasAdjusted) {
        result.buckets.forEach((normalized) => {
          const bucket = this.draftBuckets.find((b) => b.id === normalized.id);
          if (bucket) {
            bucket.percentage = normalized.percentage;
            bucket.amount = Number(((bucket.percentage / 100) * this.draftIncomeBase).toFixed(2));
          }
        });

        this.validationIsError = false;
        this.validationMessage = `A divisão "Uso diário" foi preenchida automaticamente para completar 100%.\n\nSoma final: ${this.draftTotalPercentage.toFixed(2)}%\n\nClique em "Confirmar" para salvar.`;
        this.isShowingValidationAlert = true;
        return;
      }
    }

    this.performSave();
  }

  private async performSave(): Promise<void> {
    // Divisões novas ganham um id definitivo aqui; removidas simplesmente não vão na lista.
    const finalBuckets: AllocationBucket[] = this.draftBuckets.map((draft) => ({
      id: draft.id.startsWith('new-') ? makeBucketId(draft.label) : draft.id,
      label: draft.label,
      percentage: draft.percentage,
    }));

    this.saving.set(true);
    try {
      await this.feedback.run(
        () =>
          this.financeStore.updateAllocationSettings({
            baseIncome: Number(this.draftIncomeBase),
            buckets: finalBuckets,
          }),
        { success: 'Distribuição salva' }
      );
      this.closeOrcamentoEditor();
    } catch (error) {
      const serverMessage = (error as { error?: { message?: string } })?.error?.message;
      this.feedback.error(serverMessage ?? 'Não foi possível salvar a distribuição. Verifique se o servidor está rodando.');
    } finally {
      this.saving.set(false);
    }
  }

  confirmValidation(): void {
    if (!this.validationIsError && this.isShowingValidationAlert) {
      this.isShowingValidationAlert = false;
      this.performSave();
    } else {
      this.isShowingValidationAlert = false;
    }
  }
}

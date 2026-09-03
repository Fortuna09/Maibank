import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, NgFor, NgIf, DecimalPipe } from '@angular/common';
import {
  FinanceStoreService,
  AllocationBucket,
  SalaryConfig,
} from '../../../Services/finance-store.service';
import { normalizeAllocationPercentages } from '../../../Utils/finance.utils';

@Component({
  selector: 'app-finance-distribution-page',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe, DecimalPipe],
  templateUrl: './finance-distribution-page.html',
  styleUrl: './finance-distribution-page.scss',
})
export class FinanceDistributionPage {
  readonly financeStore = inject(FinanceStoreService);

  // Controle do Modal de Edição de Distribuição
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

  // Configuração de Salário Automático
  isEditingSalary = false;
  salaryConfig: SalaryConfig = {
    id: 1,
    isEnabled: false,
    amount: 0,
    description: 'Salário automático',
    businessDay: 5,
    lastProcessedMonth: 0,
  };
  draftSalaryConfig: SalaryConfig = { ...this.salaryConfig };

  async ngOnInit(): Promise<void> {
    await this.loadSalaryConfig();
  }

  async loadSalaryConfig(): Promise<void> {
    try {
      const config = await this.financeStore.loadSalaryConfig();
      this.salaryConfig = config;
      this.draftSalaryConfig = { ...config };
    } catch (error) {
      console.error('Erro ao carregar configuração de salário', error);
    }
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

  openSalaryEditor(): void {
    this.draftSalaryConfig = { ...this.salaryConfig };
    this.isEditingSalary = true;
  }

  closeSalaryEditor(): void {
    this.isEditingSalary = false;
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

    // Validação 1: Verifica se passou 100%
    if (this.isPercentageOverLimit()) {
      return;
    }

    // Validação 2: Verifica se tem pelo menos uma divisão
    if (this.draftBuckets.length === 0) {
      this.validationIsError = true;
      this.validationMessage = 'Você precisa ter pelo menos uma divisão.';
      this.isShowingValidationAlert = true;
      return;
    }

    // Aplica auto-preenchimento se necessário
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
        this.validationMessage = `✅ Distribuição ajustada com sucesso!\n\nA divisão "Uso Diário" foi preenchida automaticamente para completar 100%.\n\nSoma final: ${this.draftTotalPercentage.toFixed(2)}%\n\nClique em "Confirmar" para salvar.`;
        this.isShowingValidationAlert = true;
        return;
      }
    }

    // Tudo OK: procede com salvamento
    this.performSave();
  }

  private async performSave(): Promise<void> {
    const originalIds = this.financeStore.settings().buckets.map((b) => b.id);
    const draftIds = this.draftBuckets.map((b) => b.id);
    originalIds.forEach((id) => {
      if (!draftIds.includes(id)) {
        this.financeStore.removeBucket(id);
      }
    });

    const finalBuckets: AllocationBucket[] = [];
    this.draftBuckets.forEach((draft) => {
      if (draft.id.startsWith('new-')) {
        const created = this.financeStore.addBucket({ label: draft.label, percentage: draft.percentage });
        if (created) finalBuckets.push(created);
      } else {
        finalBuckets.push({ id: draft.id, label: draft.label, percentage: draft.percentage });
      }
    });

    this.financeStore.updateAllocationSettings({
      baseIncome: Number(this.draftIncomeBase),
      buckets: finalBuckets,
    });

    this.closeOrcamentoEditor();
  }

  confirmValidation(): void {
    if (!this.validationIsError && this.isShowingValidationAlert) {
      // Se foi apenas aviso de ajuste, procede com salvamento
      this.isShowingValidationAlert = false;
      this.performSave();
    } else {
      this.isShowingValidationAlert = false;
    }
  }

  async saveSalaryConfig(): Promise<void> {
    try {
      if (this.draftSalaryConfig.isEnabled && this.draftSalaryConfig.amount <= 0) {
        this.validationIsError = true;
        this.validationMessage = '❌ Valor do salário não pode ser zero quando ativado.';
        this.isShowingValidationAlert = true;
        return;
      }

      await this.financeStore.updateSalaryConfig(this.draftSalaryConfig);
      this.salaryConfig = { ...this.draftSalaryConfig };
      this.closeSalaryEditor();

      this.validationIsError = false;
      this.validationMessage = '✅ Configuração de salário salva com sucesso!';
      this.isShowingValidationAlert = true;
    } catch (error) {
      console.error('Erro ao salvar configuração de salário', error);
      this.validationIsError = true;
      this.validationMessage = '❌ Erro ao salvar configuração de salário. Tente novamente.';
      this.isShowingValidationAlert = true;
    }
  }

  async processAutomaticSalary(): Promise<void> {
    try {
      await this.financeStore.processAutomaticSalary();
      await this.financeStore.refreshTransactionsPublic();
      await this.loadSalaryConfig();
      this.validationIsError = false;
      this.validationMessage = '✅ Salário automático processado com sucesso!';
      this.isShowingValidationAlert = true;
    } catch (error) {
      console.error('Erro ao processar salário automático', error);
      const errorMsg = (error as any)?.error?.message || 'Erro ao processar salário automático';
      this.validationIsError = true;
      this.validationMessage = `❌ ${errorMsg}`;
      this.isShowingValidationAlert = true;
    }
  }
}
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Icon } from '../../../../Components/icon/icon';
import { PulseOnDirective } from '../../../../Directives/pulse-on.directive';
import { FinanceStoreService } from '../../../../Services/finance-store.service';
import { categoryIcon } from '../../../../Utils/finance.utils';
import {
  goalImpacts,
  projectBucket,
  PurchaseMode,
  SimulationResult,
} from '../../../../Utils/simulation.utils';

const HORIZON_MONTHS = 6;

@Component({
  selector: 'app-purchase-simulation-page',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe, Icon, PulseOnDirective],
  templateUrl: './purchase-simulation-page.html',
  styleUrl: './purchase-simulation-page.scss',
})
export class PurchaseSimulationPage {
  readonly financeStore = inject(FinanceStoreService);
  private readonly route = inject(ActivatedRoute);

  readonly horizon = HORIZON_MONTHS;

  readonly description = signal('');
  readonly purchaseTotal = signal(0);
  readonly purchaseMode = signal<PurchaseMode>('avista');
  readonly installments = signal(3);
  readonly bucketId = signal('');
  readonly monthlyIncome = signal(0);
  readonly salaryConfigured = signal(false);

  private readonly chartCanvas = viewChild<ElementRef<SVGSVGElement>>('chart');

  readonly buckets = computed(() => this.financeStore.settings().buckets);

  readonly selectedBucket = computed(() => {
    const buckets = this.buckets();
    const chosen = buckets.find((bucket) => bucket.id === this.bucketId());
    return chosen ?? buckets.find((bucket) => bucket.id === 'uso-diario') ?? buckets[0] ?? null;
  });

  readonly startBalance = computed(() => {
    const bucket = this.selectedBucket();
    return bucket ? this.financeStore.bucketBalances()[bucket.id] ?? 0 : 0;
  });

  readonly monthlyInflow = computed(() => {
    const bucket = this.selectedBucket();
    return bucket ? Math.round(((this.monthlyIncome() * bucket.percentage) / 100) * 100) / 100 : 0;
  });

  readonly hasPurchase = computed(() => this.purchaseTotal() > 0);

  readonly result = computed<SimulationResult | null>(() => {
    const bucket = this.selectedBucket();
    if (!bucket) {
      return null;
    }

    return projectBucket({
      startBalance: this.startBalance(),
      monthlyIncome: this.monthlyIncome(),
      bucketPercentage: bucket.percentage,
      purchaseTotal: this.purchaseTotal(),
      purchaseMode: this.purchaseMode(),
      installments: this.installments(),
      months: HORIZON_MONTHS,
    });
  });

  readonly impacts = computed(() => {
    const result = this.result();
    if (!result || !this.hasPurchase()) {
      return [];
    }
    return goalImpacts(this.financeStore.goals(), result.totalPurchaseCost);
  });

  readonly monthlyInstallment = computed(() =>
    this.purchaseMode() === 'parcelado' ? this.purchaseTotal() / Math.max(1, this.installments()) : 0
  );

  readonly chartEffect = effect(() => {
    const canvas = this.chartCanvas();
    const result = this.result();
    if (canvas && result) {
      this.drawChart(canvas.nativeElement, result);
    }
  });

  constructor() {
    void this.loadIncome();
    this.applyQueryParams();
  }

  /** A assistente (e links) podem abrir a simulação já preenchida: ?descricao=&valor=&forma=&parcelas=&divisao= */
  private applyQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const total = Number(params.get('valor'));
    if (!Number.isFinite(total) || total <= 0) {
      return;
    }

    this.purchaseTotal.set(total);
    this.description.set(params.get('descricao') ?? '');

    const mode = params.get('forma');
    if (mode === 'avista' || mode === 'parcelado' || mode === 'recorrente') {
      this.purchaseMode.set(mode);
    }

    const installments = Number(params.get('parcelas'));
    if (Number.isFinite(installments) && installments >= 1) {
      this.installments.set(Math.round(installments));
    }

    const bucket = params.get('divisao');
    if (bucket) {
      this.bucketId.set(bucket);
    }
  }

  iconFor(label: string): string {
    return categoryIcon(label);
  }

  private async loadIncome(): Promise<void> {
    const salary = await this.financeStore.loadSalaryConfig();
    if (salary.isEnabled && salary.amount > 0) {
      this.monthlyIncome.set(salary.amount);
      this.salaryConfigured.set(true);
      return;
    }

    this.salaryConfigured.set(false);
    this.monthlyIncome.set(this.financeStore.settings().baseIncome);
  }

  private drawChart(canvas: SVGSVGElement, result: SimulationResult): void {
    const width = 760;
    const height = 240;
    const padding = { top: 16, right: 14, bottom: 30, left: 60 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const values = result.months.flatMap((month) => [month.without, month.with]);
    const rawMax = Math.max(...values, 0);
    const rawMin = Math.min(...values, 0);
    const span = Math.max(rawMax - rawMin, 1);
    const maxValue = rawMax + span * 0.08;
    const minValue = rawMin < 0 ? rawMin - span * 0.08 : 0;
    const range = Math.max(maxValue - minValue, 1);

    const count = result.months.length;
    const toX = (index: number) => padding.left + (innerWidth * index) / Math.max(count - 1, 1);
    const toY = (value: number) => padding.top + innerHeight - ((value - minValue) / range) * innerHeight;
    const zeroY = toY(0);

    const buildLine = (key: 'without' | 'with') =>
      result.months.map((month, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(month[key])}`).join(' ');

    const buildArea = (key: 'without' | 'with') =>
      `${buildLine(key)} L ${toX(count - 1)} ${zeroY} L ${toX(0)} ${zeroY} Z`;

    const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
    const full = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    const ticks = Array.from({ length: 4 }, (_, index) => {
      const value = Math.round((maxValue - (range * index) / 3) * 100) / 100 + 0;
      const y = toY(value);
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" style="stroke: var(--border)" stroke-width="1" />
        <text x="${padding.left - 10}" y="${y + 3.5}" text-anchor="end" style="fill: var(--text-muted)" font-size="10">R$ ${compact.format(value)}</text>
      `;
    }).join('');

    const xLabels = result.months
      .map((month, index) => `<text x="${toX(index)}" y="${height - 10}" text-anchor="middle" style="fill: var(--text-muted)" font-size="10">${month.label}</text>`)
      .join('');

    const dots = (key: 'without' | 'with', variable: string) =>
      result.months
        .map(
          (month, index) =>
            `<circle cx="${toX(index)}" cy="${toY(month[key])}" r="3" style="fill: var(${variable})"><title>${month.label} · ${full.format(month[key])}</title></circle>`
        )
        .join('');

    const zeroLine =
      minValue < 0
        ? `<line x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}" style="stroke: var(--danger)" stroke-width="1" stroke-dasharray="4 4" />`
        : '';

    canvas.innerHTML = `
      <defs>
        <linearGradient id="simWithFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style="stop-color: var(--user-tint)" stop-opacity="0.26" />
          <stop offset="100%" style="stop-color: var(--user-tint)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g>${ticks}</g>
      ${zeroLine}
      <path d="${buildArea('with')}" fill="url(#simWithFill)" stroke="none" />
      <path d="${buildLine('without')}" fill="none" style="stroke: var(--text-muted)" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${buildLine('with')}" fill="none" style="stroke: var(--user-tint)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      ${dots('without', '--text-muted')}
      ${dots('with', '--user-tint')}
      ${xLabels}
    `;
  }
}

import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../../Components/icon/icon';
import { PulseOnDirective } from '../../../../Directives/pulse-on.directive';
import { FinanceStoreService } from '../../../../Services/finance-store.service';
import { CreditProjection, parseLocalDate, projectInvoices } from '../../../../Utils/credit.utils';

const HORIZON_MONTHS = 6;

@Component({
  selector: 'app-credit-simulation-page',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe, DatePipe, Icon, PulseOnDirective],
  templateUrl: './credit-simulation-page.html',
  styleUrl: './credit-simulation-page.scss',
})
export class CreditSimulationPage {
  readonly financeStore = inject(FinanceStoreService);

  readonly description = signal('');
  readonly purchaseTotal = signal(0);
  readonly installments = signal(1);
  readonly purchaseDate = signal(new Date().toISOString().slice(0, 10));
  readonly monthlyIncome = signal(0);
  readonly salaryConfigured = signal(false);

  private readonly chartCanvas = viewChild<ElementRef<SVGSVGElement>>('chart');

  readonly hasPurchase = computed(() => this.purchaseTotal() > 0);

  readonly projection = computed<CreditProjection>(() =>
    projectInvoices(
      this.financeStore.invoices(),
      {
        total: this.purchaseTotal(),
        installments: Math.max(1, Math.round(this.installments() || 1)),
        date: parseLocalDate(this.purchaseDate() || new Date().toISOString().slice(0, 10)),
      },
      this.financeStore.creditConfig(),
      HORIZON_MONTHS
    )
  );

  /** Quanto da renda a maior fatura consome — só faz sentido se a renda é conhecida. */
  readonly peakShare = computed(() => {
    const peak = this.projection().peak;
    const income = this.monthlyIncome();
    return peak && income > 0 ? Math.round((peak.total / income) * 100) : null;
  });

  readonly chartEffect = effect(() => {
    const canvas = this.chartCanvas();
    const projection = this.projection();
    if (canvas) {
      this.drawChart(canvas.nativeElement, projection);
    }
  });

  constructor() {
    void this.loadIncome();
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

  private drawChart(canvas: SVGSVGElement, projection: CreditProjection): void {
    const width = 760;
    const height = 220;
    const padding = { top: 16, right: 14, bottom: 30, left: 60 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const baseline = padding.top + innerHeight;

    const rows = projection.rows;
    const maxValue = Math.max(1, ...rows.map((row) => row.total)) * 1.08;
    const slot = innerWidth / Math.max(rows.length, 1);
    const barWidth = Math.min(56, slot * 0.55);

    const toY = (value: number) => padding.top + innerHeight - (value / maxValue) * innerHeight;
    const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
    const full = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    const ticks = Array.from({ length: 4 }, (_, index) => {
      const value = Math.round(((maxValue * (3 - index)) / 3) * 100) / 100 + 0;
      const y = toY(value);
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" style="stroke: var(--border)" stroke-width="1" />
        <text x="${padding.left - 10}" y="${y + 3.5}" text-anchor="end" style="fill: var(--text-muted)" font-size="10">R$ ${compact.format(value)}</text>
      `;
    }).join('');

    const bars = rows
      .map((row, index) => {
        const x = padding.left + slot * index + (slot - barWidth) / 2;
        const existingTop = toY(row.existing);
        const totalTop = toY(row.total);
        const isPeak = projection.peak?.key === row.key && row.total > 0;

        return `
          <rect x="${x}" y="${existingTop}" width="${barWidth}" height="${baseline - existingTop}" style="fill: var(--text-muted)" fill-opacity="0.45">
            <title>${row.label} · já comprometido ${full.format(row.existing)}</title>
          </rect>
          <rect x="${x}" y="${totalTop}" width="${barWidth}" height="${existingTop - totalTop}" style="fill: var(--credit)">
            <title>${row.label} · nova compra ${full.format(row.added)}</title>
          </rect>
          ${
            isPeak
              ? `<text x="${x + barWidth / 2}" y="${totalTop - 5}" text-anchor="middle" style="fill: var(--text)" font-size="10" font-weight="700">${full.format(row.total)}</text>`
              : ''
          }
          <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" style="fill: var(--text-muted)" font-size="10">${row.label}</text>
        `;
      })
      .join('');

    canvas.innerHTML = `
      <g>${ticks}</g>
      <line x1="${padding.left}" y1="${baseline}" x2="${width - padding.right}" y2="${baseline}" style="stroke: var(--border-strong)" stroke-width="1" />
      ${bars}
    `;
  }
}

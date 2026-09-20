import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal, AfterViewInit, ViewChild, ElementRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../../Components/icon/icon';
import { FeedbackService } from '../../../../Services/feedback.service';
import { FinanceStoreService, FinanceTransaction } from '../../../../Services/finance-store.service';
import { categoryIcon, transactionIcon, transactionLabel } from '../../../../Utils/finance.utils';

@Component({
  selector: 'app-history-page',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe, Icon],
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
})
export class HistoryPage implements AfterViewInit {
  readonly financeStore = inject(FinanceStoreService);
  private readonly feedback = inject(FeedbackService);

  readonly transactionsEffect = effect(() => {
    this.financeStore.transactions();
    this.drawChart();
  });

  searchTerm = '';
  selectedDate = '';
  currentPage = 1;
  readonly pageSize = 8;
  chartRangeDays = 30;

  readonly deletingId = signal<string | null>(null);

  @ViewChild('monthlyLine', { static: false }) private monthlyLineCanvas!: ElementRef<SVGSVGElement>;

  onChartRangeChange(days: number): void {
    this.chartRangeDays = days;
    this.drawChart();
  }

  iconFor(label: string): string {
    return categoryIcon(label);
  }

  typeIcon(transaction: FinanceTransaction): string {
    return transactionIcon(transaction.type);
  }

  typeLabel(transaction: FinanceTransaction): string {
    return transactionLabel(transaction.type);
  }

  deleteTransaction(transactionId: string): void {
    this.deletingId.set(transactionId);
    this.feedback
      .run(() => this.financeStore.removeTransaction(transactionId), {
        success: 'Lançamento apagado',
        error: 'Não foi possível apagar o lançamento. Tente novamente.',
      })
      .catch(() => undefined)
      .finally(() => this.deletingId.set(null));
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedDate = '';
    this.currentPage = 1;
  }

  filteredTransactions(): FinanceTransaction[] {
    const query = this.searchTerm.trim().toLowerCase();

    return [...this.financeStore.transactions()]
      .filter((transaction) => {
        const matchesSearch =
          !query ||
          transaction.description.toLowerCase().includes(query) ||
          transaction.category.toLowerCase().includes(query);
        const matchesDate = !this.selectedDate || transaction.date === this.selectedDate;

        return matchesSearch && matchesDate;
      })
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }

  paginatedTransactions(): FinanceTransaction[] {
    const filtered = this.filteredTransactions();
    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTransactions().length / this.pageSize));
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.currentPage += 1;
    }
  }

  ngAfterViewInit(): void {
    this.drawChart();
  }

  private drawChart(): void {
    if (!this.monthlyLineCanvas?.nativeElement) {
      return;
    }

    const series = this.getRangeSeries(this.chartRangeDays);
    const width = 760;
    const height = 240;
    const padding = { top: 16, right: 14, bottom: 30, left: 56 };
    const maxValue = Math.max(
      1,
      ...series.entradas.map((value, index) => Math.max(value, series.saidas[index] || 0))
    );

    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const baseline = padding.top + innerHeight;

    const toX = (index: number) => padding.left + (innerWidth * index) / Math.max(series.labels.length - 1, 1);
    const toY = (value: number) => padding.top + innerHeight - (value / maxValue) * innerHeight;

    const buildLine = (values: number[]) =>
      values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`).join(' ');

    const buildArea = (values: number[]) =>
      `${buildLine(values)} L ${toX(values.length - 1)} ${baseline} L ${toX(0)} ${baseline} Z`;

    const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
    const full = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    const yTicks = Array.from({ length: 4 }, (_, index) => {
      const value = (maxValue * (3 - index)) / 3;
      const y = padding.top + (innerHeight * index) / 3;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" style="stroke: var(--border)" stroke-width="1" />
        <text x="${padding.left - 10}" y="${y + 3.5}" text-anchor="end" style="fill: var(--text-muted)" font-size="10">R$ ${compact.format(value)}</text>
      `;
    }).join('');

    const labelStep = Math.max(1, Math.ceil(series.labels.length / 6));
    const xLabels = series.labels
      .map((label, index) => {
        if (index % labelStep !== 0 && index !== series.labels.length - 1) {
          return '';
        }
        return `<text x="${toX(index)}" y="${height - 10}" text-anchor="middle" style="fill: var(--text-muted)" font-size="10">${label}</text>`;
      })
      .join('');

    const buildDots = (values: number[], variable: string) =>
      values
        .map((value, index) =>
          value > 0
            ? `<circle cx="${toX(index)}" cy="${toY(value)}" r="2.6" style="fill: var(${variable})"><title>${series.labels[index]} · ${full.format(value)}</title></circle>`
            : ''
        )
        .join('');

    this.monthlyLineCanvas.nativeElement.innerHTML = `
      <defs>
        <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style="stop-color: var(--success)" stop-opacity="0.28" />
          <stop offset="100%" style="stop-color: var(--success)" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style="stop-color: var(--danger)" stop-opacity="0.22" />
          <stop offset="100%" style="stop-color: var(--danger)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g>${yTicks}</g>
      <line x1="${padding.left}" y1="${baseline}" x2="${width - padding.right}" y2="${baseline}" style="stroke: var(--border-strong)" stroke-width="1" />
      <path d="${buildArea(series.entradas)}" fill="url(#incomeFill)" stroke="none" />
      <path d="${buildArea(series.saidas)}" fill="url(#expenseFill)" stroke="none" />
      <path d="${buildLine(series.entradas)}" fill="none" style="stroke: var(--success)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${buildLine(series.saidas)}" fill="none" style="stroke: var(--danger)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      ${buildDots(series.entradas, '--success')}
      ${buildDots(series.saidas, '--danger')}
      ${xLabels}
    `;
  }

  private getRangeSeries(days: number): { labels: string[]; entradas: number[]; saidas: number[] } {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const labels: string[] = [];
    const entradasMap = new Map<string, number>();
    const saidasMap = new Map<string, number>();

    for (let index = 0; index < days; index += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      labels.push(this.formatDayLabel(date));
      entradasMap.set(key, 0);
      saidasMap.set(key, 0);
    }

    for (const transaction of this.financeStore.transactions()) {
      const transactionDate = new Date(transaction.date);
      if (Number.isNaN(transactionDate.getTime())) {
        continue;
      }

      if (transactionDate < startDate || transactionDate > now) {
        continue;
      }

      const key = transactionDate.toISOString().slice(0, 10);
      if (transaction.type === 'entrada') {
        entradasMap.set(key, (entradasMap.get(key) ?? 0) + transaction.amount);
      } else if (transaction.type === 'saida') {
        saidasMap.set(key, (saidasMap.get(key) ?? 0) + transaction.amount);
      }
    }

    return {
      labels,
      entradas: labels.map((_, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        const key = date.toISOString().slice(0, 10);
        return entradasMap.get(key) ?? 0;
      }),
      saidas: labels.map((_, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        const key = date.toISOString().slice(0, 10);
        return saidasMap.get(key) ?? 0;
      }),
    };
  }

  private formatDayLabel(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  }
}

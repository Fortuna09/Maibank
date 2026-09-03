import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, AfterViewInit, ViewChild, ElementRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AllocationBucketId,
  AllocationMode,
  FinanceStoreService,
  FinanceTransaction,
  TransactionType,
} from '../../../../Services/finance-store.service';

@Component({
  selector: 'app-finance-transactions-page',
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe],
  templateUrl: './finance-transactions-page.html',
  styleUrl: './finance-transactions-page.scss',
})
export class FinanceTransactionsPage implements AfterViewInit {
  readonly financeStore = inject(FinanceStoreService);

  readonly transactionsEffect = effect(() => {
    this.financeStore.transactions();
    this.drawChart();
  });

  description = '';
  type: TransactionType = 'entrada';
  allocationMode: AllocationMode = 'percentual';
  selectedBucketId: AllocationBucketId = 'uso-diario';
  amount = 0;
  category = '';
  date = new Date().toISOString().slice(0, 10);

  showAddForm = false;
  searchTerm = '';
  selectedDate = '';
  currentPage = 1;
  readonly pageSize = 8;
  chartRangeDays = 30;

  @ViewChild('monthlyLine', { static: false }) private monthlyLineCanvas!: ElementRef<SVGSVGElement>;

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
  }

  onChartRangeChange(days: number): void {
    this.chartRangeDays = days;
    this.drawChart();
  }

  addTransaction(): void {
    if (!this.description || !this.category || this.amount <= 0) {
      return;
    }

    this.financeStore.addTransaction({
      description: this.description,
      type: this.type,
      amount: this.amount,
      category: this.category,
      date: this.date,
      allocationMode: this.allocationMode,
      bucketId: this.selectedBucketId,
    });

    this.description = '';
    this.type = 'entrada';
    this.allocationMode = 'percentual';
    this.selectedBucketId = 'uso-diario';
    this.amount = 0;
    this.category = '';
    this.date = new Date().toISOString().slice(0, 10);
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
    const height = 220;
    const padding = { top: 18, right: 16, bottom: 28, left: 42 };
    const maxValue = Math.max(
      1,
      ...series.entradas.map((value, index) => Math.max(value, series.saidas[index] || 0))
    );

    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const toX = (index: number) => padding.left + (innerWidth * index) / Math.max(series.labels.length - 1, 1);
    const toY = (value: number) => padding.top + innerHeight - (value / maxValue) * innerHeight;

    const buildLine = (values: number[]) =>
      values
        .map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`)
        .join(' ');

    const yTicks = Array.from({ length: 4 }, (_, index) => {
      const value = Math.round((maxValue * (3 - index)) / 3);
      const y = padding.top + (innerHeight * index) / 3;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />
        <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="#6b7280" font-size="10">R$${value}</text>
      `;
    }).join('');

    const xLabels = series.labels
      .map((label, index) => {
        const x = toX(index);
        return `<text x="${x}" y="${height - 8}" text-anchor="middle" fill="#6b7280" font-size="10" transform="rotate(-35 ${x} ${height - 8})">${label}</text>`;
      })
      .join('');

    const entriesPath = buildLine(series.entradas);
    const expensesPath = buildLine(series.saidas);

    this.monthlyLineCanvas.nativeElement.innerHTML = `
      <g>
        ${yTicks}
      </g>
      <line x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${width - padding.right}" y2="${padding.top + innerHeight}" stroke="#cbd5e1" stroke-width="1" />
      <path d="${entriesPath}" fill="none" stroke="#111827" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${expensesPath}" fill="none" stroke="#6b7280" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
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
      } else {
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

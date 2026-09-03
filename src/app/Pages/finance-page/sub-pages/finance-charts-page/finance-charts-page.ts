import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FinanceStoreService } from '../../../../Services/finance-store.service';

@Component({
  selector: 'app-finance-charts-page',
  imports: [NgFor, NgIf, CurrencyPipe],
  templateUrl: './finance-charts-page.html',
  styleUrl: './finance-charts-page.scss',
})
export class FinanceChartsPage {
  readonly financeStore = inject(FinanceStoreService);

  readonly monthlyData = computed(() => this.financeStore.getMonthlyCashFlow());

  getScale(entradas: number, saidas: number): number {
    const maxValue = Math.max(entradas, saidas);
    if (maxValue <= 0) {
      return 0;
    }

    return maxValue;
  }

  getBarWidth(value: number, scale: number): number {
    if (scale <= 0) {
      return 0;
    }

    return Math.max(6, Math.round((value / scale) * 100));
  }
}

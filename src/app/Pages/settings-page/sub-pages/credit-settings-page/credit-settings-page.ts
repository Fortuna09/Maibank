import { DatePipe, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../../Components/icon/icon';
import { FeedbackService } from '../../../../Services/feedback.service';
import { FinanceStoreService } from '../../../../Services/finance-store.service';
import { closingDateFor, dueDateFor } from '../../../../Utils/credit.utils';

@Component({
  selector: 'app-credit-settings-page',
  imports: [FormsModule, NgIf, DatePipe, Icon],
  templateUrl: './credit-settings-page.html',
  styleUrl: './credit-settings-page.scss',
})
export class CreditSettingsPage {
  readonly financeStore = inject(FinanceStoreService);
  private readonly feedback = inject(FeedbackService);

  readonly closingDay = signal(this.financeStore.creditConfig().closingDay);
  readonly dueDay = signal(this.financeStore.creditConfig().dueDay);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  /** Exemplo concreto com os valores do rascunho: quando fecha e vence a fatura aberta hoje. */
  readonly preview = computed(() => {
    const config = { id: 1, closingDay: this.clamp(this.closingDay()), dueDay: this.clamp(this.dueDay()) };
    const closing = closingDateFor(new Date(), config);
    return { closing, due: dueDateFor(closing, config) };
  });

  async save(): Promise<void> {
    this.error.set(null);
    this.saving.set(true);

    try {
      await this.feedback.run(
        () =>
          this.financeStore.updateCreditConfig({
            closingDay: this.clamp(this.closingDay()),
            dueDay: this.clamp(this.dueDay()),
          }),
        { success: 'Configuração do cartão salva' }
      );
      this.closingDay.set(this.financeStore.creditConfig().closingDay);
      this.dueDay.set(this.financeStore.creditConfig().dueDay);
    } catch {
      this.error.set('Não foi possível salvar. Verifique se o servidor está rodando.');
    } finally {
      this.saving.set(false);
    }
  }

  private clamp(value: number): number {
    return Math.min(28, Math.max(1, Math.round(Number(value) || 1)));
  }
}

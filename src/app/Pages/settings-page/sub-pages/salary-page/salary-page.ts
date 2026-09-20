import { CurrencyPipe, NgIf } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../../Components/icon/icon';
import { FeedbackService } from '../../../../Services/feedback.service';
import { FinanceStoreService, SalaryConfig } from '../../../../Services/finance-store.service';

@Component({
  selector: 'app-salary-page',
  imports: [FormsModule, NgIf, CurrencyPipe, Icon],
  templateUrl: './salary-page.html',
  styleUrl: './salary-page.scss',
})
export class SalaryPage implements OnInit {
  readonly financeStore = inject(FinanceStoreService);
  private readonly feedback = inject(FeedbackService);

  draft: SalaryConfig = {
    id: 1,
    isEnabled: false,
    amount: 0,
    description: 'Salário automático',
    payDay: 5,
    lastProcessedMonth: 0,
  };

  readonly saving = signal(false);
  readonly processing = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async save(): Promise<void> {
    this.error.set(null);

    if (this.draft.isEnabled && this.draft.amount <= 0) {
      this.error.set('Informe o valor do salário para ativar o lançamento automático.');
      return;
    }

    this.saving.set(true);
    try {
      await this.feedback.run(() => this.financeStore.updateSalaryConfig(this.draft), {
        success: 'Salário automático salvo',
      });
    } catch {
      this.error.set('Não foi possível salvar. Verifique se o servidor está rodando.');
    } finally {
      this.saving.set(false);
    }
  }

  async processNow(): Promise<void> {
    this.error.set(null);
    this.processing.set(true);

    try {
      const result = await this.feedback.run(() => this.financeStore.processAutomaticSalary());
      if (result.processed) {
        await this.financeStore.refreshTransactionsPublic();
        await this.load();
        this.feedback.success('Salário lançado e distribuído');
      } else {
        this.error.set(result.reason ?? 'Nada a processar agora.');
      }
    } catch {
      this.error.set('Não foi possível processar. Verifique se o servidor está rodando.');
    } finally {
      this.processing.set(false);
    }
  }

  private async load(): Promise<void> {
    this.draft = { ...(await this.financeStore.loadSalaryConfig()) };
  }
}

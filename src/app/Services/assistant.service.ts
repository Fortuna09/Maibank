import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AssistantAction,
  AssistantClient,
  AssistantContext,
  AssistantMessage,
  AssistantPanelState,
} from '../Models/assistant.model';
import { AppearanceService } from './appearance.service';
import { AuthService } from './auth.service';
import { MockAssistantClient } from './assistant-mock.client';
import { FeedbackService } from './feedback.service';
import { FinanceStoreService } from './finance-store.service';
import { todayLocalIso } from '../Utils/finance.utils';

const STORAGE_PANEL = 'maibank-assistant-panel';
const STORAGE_MESSAGES = 'maibank-assistant-messages';
const STORAGE_API_KEY = 'maibank-assistant-key';
const STORAGE_MODEL = 'maibank-assistant-model';
const MAX_MESSAGES = 60;

export const DEFAULT_ASSISTANT_MODEL = 'claude-opus-5';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage pode estar bloqueado; o app segue funcionando sem persistir.
  }
}

@Injectable({
  providedIn: 'root',
})
export class AssistantService {
  private readonly financeStore = inject(FinanceStoreService);
  private readonly appearance = inject(AppearanceService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  /** Troque por um cliente real quando a chave estiver configurada (ver assistant-prompt.ts). */
  private client: AssistantClient = new MockAssistantClient();

  readonly panel = signal<AssistantPanelState>(read<AssistantPanelState>(STORAGE_PANEL, 'closed'));
  readonly messages = signal<AssistantMessage[]>(read<AssistantMessage[]>(STORAGE_MESSAGES, []));
  readonly thinking = signal(false);
  readonly unread = signal(0);

  readonly apiKey = signal<string>(read<string>(STORAGE_API_KEY, ''));
  readonly model = signal<string>(read<string>(STORAGE_MODEL, DEFAULT_ASSISTANT_MODEL));

  readonly isVisible = computed(() => this.panel() === 'open' || this.panel() === 'expanded');
  readonly isExpanded = computed(() => this.panel() === 'expanded');
  readonly isMinimized = computed(() => this.panel() === 'minimized');
  readonly isConnected = computed(() => this.apiKey().trim().length > 0);

  constructor() {
    // A conversa tem dados financeiros e a chave é de quem a colou: nada disso fica para a próxima pessoa no navegador.
    this.auth.onLogout(() => {
      this.messages.set([]);
      this.unread.set(0);
      this.apiKey.set('');
      this.panel.set('closed');
    });

    effect(() => write(STORAGE_PANEL, this.panel()));
    effect(() => write(STORAGE_MESSAGES, this.messages().slice(-MAX_MESSAGES)));
    effect(() => write(STORAGE_API_KEY, this.apiKey()));
    effect(() => write(STORAGE_MODEL, this.model()));

    // Deixa o resto da UI (toasts) saber onde o painel está.
    effect(() => {
      document.body.classList.toggle('assistant-open', this.isVisible());
      document.body.classList.toggle('assistant-expanded', this.isExpanded());
      document.body.classList.toggle('assistant-minimized', this.isMinimized());
    });
  }

  // ----- painel -----

  open(): void {
    this.panel.set(this.panel() === 'expanded' ? 'expanded' : 'open');
    this.unread.set(0);
  }

  close(): void {
    this.panel.set('closed');
  }

  minimize(): void {
    this.panel.set('minimized');
  }

  toggle(): void {
    if (this.isVisible()) {
      this.close();
    } else {
      this.open();
    }
  }

  toggleExpanded(): void {
    this.panel.set(this.isExpanded() ? 'open' : 'expanded');
  }

  // ----- conversa -----

  async send(rawText: string): Promise<void> {
    const text = rawText.trim();
    if (!text || this.thinking()) {
      return;
    }

    this.push({ id: this.makeId(), role: 'user', text, createdAt: new Date().toISOString() });
    this.thinking.set(true);

    try {
      const context = await this.buildContext();
      const reply = await this.client.reply(this.messages(), context);
      this.push({
        id: this.makeId(),
        role: 'assistant',
        text: reply.text,
        createdAt: new Date().toISOString(),
        action: reply.action,
      });
      if (!this.isVisible()) {
        this.unread.update((count) => count + 1);
      }
    } catch (error) {
      console.error('Erro na assistente', error);
      this.push({
        id: this.makeId(),
        role: 'assistant',
        text: 'Não consegui responder agora. Tenta de novo em instantes.',
        createdAt: new Date().toISOString(),
      });
    } finally {
      this.thinking.set(false);
    }
  }

  clear(): void {
    this.messages.set([]);
    this.unread.set(0);
  }

  // ----- ações propostas -----

  async confirmAction(messageId: string): Promise<void> {
    const message = this.messages().find((item) => item.id === messageId);
    const action = message?.action;
    if (!action || action.status !== 'pending') {
      return;
    }

    try {
      await this.execute(action);
      this.setActionStatus(messageId, 'done');
    } catch {
      this.setActionStatus(messageId, 'failed');
    }
  }

  cancelAction(messageId: string): void {
    this.setActionStatus(messageId, 'cancelled');
  }

  private async execute(action: AssistantAction): Promise<void> {
    const { payload } = action;

    switch (payload.type) {
      case 'add_transaction':
        await this.feedback.run(() => this.financeStore.addTransaction(payload.data), {
          success: 'Lançamento salvo',
          error: 'Não foi possível salvar o lançamento.',
        });
        return;

      case 'create_goal':
        await this.feedback.run(() => this.financeStore.addGoal(payload.data), {
          success: 'Meta criada',
          error: 'Não foi possível criar a meta.',
        });
        return;

      case 'simulate_purchase': {
        const { description, total, mode, installments, bucketId } = payload.data;
        await this.router.navigate(['/simulacao/lancamento'], {
          queryParams: { descricao: description, valor: total, forma: mode, parcelas: installments, divisao: bucketId ?? 'uso-diario' },
        });
        // Em telas estreitas o painel cobre a simulação; minimiza para ela aparecer.
        if (window.innerWidth < 1100) {
          this.minimize();
        }
        return;
      }
    }
  }

  private setActionStatus(messageId: string, status: AssistantAction['status']): void {
    this.messages.update((list) =>
      list.map((item) => (item.id === messageId && item.action ? { ...item, action: { ...item.action, status } } : item))
    );
  }

  // ----- contexto para o prompt -----

  private async buildContext(): Promise<AssistantContext> {
    const settings = this.financeStore.settings();
    const balances = this.financeStore.bucketBalances();
    const salary = await this.financeStore.loadSalaryConfig();
    const openInvoice = this.financeStore.openInvoice();

    return {
      today: todayLocalIso(),
      userName: this.appearance.userName() || this.auth.firstName(),
      saldoTotal: this.financeStore.saldoAtual(),
      buckets: settings.buckets.map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        percentage: bucket.percentage,
        balance: balances[bucket.id] ?? 0,
      })),
      goals: this.financeStore.goals().map((goal) => ({
        id: goal.id,
        title: goal.title,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        saveAmount: goal.saveAmount,
        saveFrequency: goal.saveFrequency,
        dueDate: goal.dueDate,
      })),
      monthlyIncome: salary.isEnabled && salary.amount > 0 ? salary.amount : settings.baseIncome,
      credit: {
        closingDay: this.financeStore.creditConfig().closingDay,
        dueDay: this.financeStore.creditConfig().dueDay,
        openInvoiceTotal: openInvoice?.total ?? 0,
        openInvoiceLabel: openInvoice?.label ?? null,
      },
      recentTransactions: [...this.financeStore.transactions()]
        .sort((left, right) => right.date.localeCompare(left.date))
        .slice(0, 8)
        .map((transaction) => ({
          description: transaction.description,
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          date: transaction.date,
        })),
    };
  }

  private push(message: AssistantMessage): void {
    this.messages.update((list) => [...list, message].slice(-MAX_MESSAGES));
  }

  private makeId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

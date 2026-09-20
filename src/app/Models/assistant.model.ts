import { CreateGoalPayload, CreateTransactionPayload } from './finance.model';

export type AssistantPanelState = 'closed' | 'open' | 'expanded' | 'minimized';

export type AssistantActionType = 'add_transaction' | 'create_goal' | 'simulate_purchase';

export interface SimulatePurchasePayload {
  description: string;
  total: number;
  mode: 'avista' | 'parcelado' | 'recorrente';
  installments: number;
  bucketId?: string;
}

export type AssistantActionPayload =
  | { type: 'add_transaction'; data: CreateTransactionPayload }
  | { type: 'create_goal'; data: CreateGoalPayload }
  | { type: 'simulate_purchase'; data: SimulatePurchasePayload };

/**
 * Uma ação que a assistente propõe e o usuário confirma antes de executar.
 * Nada roda sem clique em "Confirmar".
 */
export interface AssistantAction {
  payload: AssistantActionPayload;
  /** Linhas curtas mostradas no cartão de confirmação (ex.: "Valor · R$ 50,00"). */
  summary: Array<{ label: string; value: string }>;
  status: 'pending' | 'done' | 'cancelled' | 'failed';
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  action?: AssistantAction;
}

/** Contexto financeiro resumido que vai no prompt a cada mensagem. */
export interface AssistantContext {
  today: string;
  userName: string;
  saldoTotal: number;
  buckets: Array<{ id: string; label: string; percentage: number; balance: number }>;
  goals: Array<{ id: string; title: string; targetAmount: number; currentAmount: number; saveAmount: number; saveFrequency: string; dueDate: string | null }>;
  monthlyIncome: number;
  credit: { closingDay: number; dueDay: number; openInvoiceTotal: number; openInvoiceLabel: string | null };
  recentTransactions: Array<{ description: string; type: string; amount: number; category: string; date: string }>;
}

export interface AssistantReply {
  text: string;
  action?: AssistantAction;
}

/**
 * Ponto de troca: hoje é o cliente local simulado; depois vira a chamada real ao modelo.
 * Recebe a conversa inteira porque a API é stateless.
 */
export interface AssistantClient {
  reply(history: AssistantMessage[], context: AssistantContext): Promise<AssistantReply>;
}

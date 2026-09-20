export type TransactionType = 'entrada' | 'saida' | 'credito';
export type AllocationMode = 'percentual' | 'especifico';
export type AllocationBucketId = string;

export interface AllocationEntry {
  bucketId: AllocationBucketId;
  amount: number;
}

export interface AllocationBucket {
  id: AllocationBucketId;
  label: string;
  percentage: number;
}

export interface AllocationSettings {
  baseIncome: number;
  buckets: AllocationBucket[];
}

export interface SalaryConfig {
  id: number;
  isEnabled: boolean;
  amount: number;
  description: string;
  payDay: number;
  lastProcessedMonth: number;
}

export interface SalaryProcessResult {
  ok: boolean;
  processed: boolean;
  reason?: string;
  id?: string;
}

export interface FinanceTransaction {
  id: string;
  description: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  allocationMode: AllocationMode;
  allocations: AllocationEntry[];
  /** Só para crédito: em quantas faturas o valor é dividido (1 = à vista). */
  installments: number;
  /** Só para saídas que pagam uma fatura: mês da fatura no formato YYYY-MM. */
  paidInvoice: string | null;
}

export interface CreditConfig {
  id: number;
  closingDay: number;
  dueDay: number;
}

export type GoalSaveFrequency = 'mensal' | 'semanal';

export interface FinanceGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: string | null;
  saveAmount: number;
  saveFrequency: GoalSaveFrequency;
  createdAt: string;
}

export interface CreateTransactionPayload {
  description: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  allocationMode: AllocationMode;
  bucketId?: AllocationBucketId;
  installments?: number;
  paidInvoice?: string | null;
}

export interface CreateGoalPayload {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  dueDate?: string | null;
  saveAmount: number;
  saveFrequency: GoalSaveFrequency;
  createdAt?: string;
}

export const DEFAULT_ALLOCATION_SETTINGS: AllocationSettings = {
  baseIncome: 2700,
  buckets: [
    { id: 'reserva-emergencia', label: 'Reserva de emergencia', percentage: 37 },
    { id: 'uso-diario', label: 'Uso diario', percentage: 37 },
    { id: 'carro', label: 'Gastos com carro', percentage: 11 },
    { id: 'planos-futuros', label: 'Planos futuros', percentage: 15 },
  ],
};

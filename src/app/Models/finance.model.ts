export type TransactionType = 'entrada' | 'saida';
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
  businessDay: number;
  lastProcessedMonth: number;
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

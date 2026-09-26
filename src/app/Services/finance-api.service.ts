import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AllocationSettings,
  CreateGoalPayload,
  CreditConfig,
  CreateTransactionPayload,
  FinanceGoal,
  FinanceTransaction,
  SalaryConfig,
  SalaryProcessResult,
} from '../Models/finance.model';
import { todayLocalIso } from '../Utils/finance.utils';

@Injectable({
  providedIn: 'root',
})
export class FinanceApiService {
  private readonly http = inject(HttpClient);
  // Relativo: em produção a Vercel serve front e API no mesmo domínio; no dev o `ng serve` faz proxy.
  private readonly apiBaseUrl = '/api';

  getSettings() {
    return this.http.get<{ baseIncome: number; buckets: Array<{ id: string; label: string; percentage: number }> }>(
      `${this.apiBaseUrl}/settings`
    );
  }

  updateSettings(settings: AllocationSettings) {
    return this.http.put(`${this.apiBaseUrl}/settings`, {
      baseIncome: settings.baseIncome,
      buckets: settings.buckets,
    });
  }

  getSalaryConfig() {
    return this.http.get<SalaryConfig>(`${this.apiBaseUrl}/salary-config`);
  }

  updateSalaryConfig(config: Omit<SalaryConfig, 'id'> & { id?: number }) {
    return this.http.put(`${this.apiBaseUrl}/salary-config`, config);
  }

  processAutomaticSalary() {
    return this.http.post<SalaryProcessResult>(`${this.apiBaseUrl}/salary-config/process`, {});
  }

  getCreditConfig() {
    return this.http.get<CreditConfig>(`${this.apiBaseUrl}/credit-config`);
  }

  updateCreditConfig(config: Omit<CreditConfig, 'id'>) {
    return this.http.put(`${this.apiBaseUrl}/credit-config`, config);
  }

  getTransactions() {
    return this.http.get<FinanceTransaction[]>(`${this.apiBaseUrl}/transactions`);
  }

  createTransaction(payload: Omit<FinanceTransaction, 'id'>) {
    return this.http.post<{ id: string }>(`${this.apiBaseUrl}/transactions`, payload);
  }

  deleteTransaction(transactionId: string) {
    return this.http.delete(`${this.apiBaseUrl}/transactions/${transactionId}`);
  }

  getGoals() {
    return this.http.get<FinanceGoal[]>(`${this.apiBaseUrl}/goals`);
  }

  createGoal(payload: CreateGoalPayload) {
    return this.http.post<{ id: string }>(`${this.apiBaseUrl}/goals`, {
      title: payload.title,
      targetAmount: Number(payload.targetAmount),
      currentAmount: Math.max(0, Number(payload.currentAmount ?? 0)),
      dueDate: payload.dueDate,
      saveAmount: Math.max(0, Number(payload.saveAmount)),
      saveFrequency: payload.saveFrequency,
      createdAt: payload.createdAt ?? todayLocalIso(),
    });
  }

  updateGoal(goalId: string, payload: Omit<FinanceGoal, 'id'>) {
    return this.http.put(`${this.apiBaseUrl}/goals/${goalId}`, {
      title: payload.title,
      dueDate: payload.dueDate,
      targetAmount: Math.max(0, Number(payload.targetAmount)),
      currentAmount: Math.max(0, Number(payload.currentAmount)),
      saveAmount: Math.max(0, Number(payload.saveAmount)),
      saveFrequency: payload.saveFrequency,
      createdAt: payload.createdAt ?? todayLocalIso(),
    });
  }

  deleteGoal(goalId: string) {
    return this.http.delete(`${this.apiBaseUrl}/goals/${goalId}`);
  }

  addGoalContribution(goalId: string, amount: number, date = todayLocalIso()) {
    return this.http.post(`${this.apiBaseUrl}/goals/${goalId}/contributions`, { amount, date });
  }
}

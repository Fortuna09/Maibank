import { computed, Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
  leaving: boolean;
}

export interface RunMessages {
  success?: string;
  error?: string;
}

/** Tempo mínimo que um "carregando" fica visível, para não piscar em respostas rápidas. */
const MIN_PENDING_MS = 380;
const LEAVE_MS = 220;

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private readonly pendingCount = signal(0);
  private nextId = 1;
  private readonly timers = new Map<number, number>();

  /** Verdadeiro enquanto alguma operação rastreada por `run()` está em andamento. */
  readonly busy = computed(() => this.pendingCount() > 0);
  readonly toasts = signal<Toast[]>([]);

  /**
   * Executa uma operação mostrando a barra de progresso global e, ao final,
   * um toast de sucesso ou erro. Rejeita com o mesmo erro da operação.
   */
  async run<T>(work: () => Promise<T>, messages: RunMessages = {}): Promise<T> {
    const started = performance.now();
    this.pendingCount.update((count) => count + 1);

    try {
      const result = await work();
      await this.holdMinimum(started);
      if (messages.success) {
        this.success(messages.success);
      }
      return result;
    } catch (error) {
      await this.holdMinimum(started);
      if (messages.error) {
        this.error(messages.error);
      }
      throw error;
    } finally {
      this.pendingCount.update((count) => count - 1);
    }
  }

  success(message: string, duration = 2600): void {
    this.push('success', message, duration);
  }

  error(message: string, duration = 4500): void {
    this.push('error', message, duration);
  }

  info(message: string, duration = 2600): void {
    this.push('info', message, duration);
  }

  dismiss(id: number): void {
    window.clearTimeout(this.timers.get(id));
    this.timers.delete(id);

    this.toasts.update((list) => list.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    window.setTimeout(() => {
      this.toasts.update((list) => list.filter((toast) => toast.id !== id));
    }, LEAVE_MS);
  }

  private push(kind: ToastKind, message: string, duration: number): void {
    const toast: Toast = { id: this.nextId++, kind, message, duration, leaving: false };
    // No máximo três na tela; o mais antigo sai.
    this.toasts.update((list) => [...list.slice(-2), toast]);
    this.timers.set(toast.id, window.setTimeout(() => this.dismiss(toast.id), duration));
  }

  private holdMinimum(started: number): Promise<void> {
    const remaining = MIN_PENDING_MS - (performance.now() - started);
    return remaining > 0 ? new Promise((resolve) => window.setTimeout(resolve, remaining)) : Promise.resolve();
  }
}

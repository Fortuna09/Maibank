import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export interface InboxMessage {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface SentBatch {
  batchId: string;
  title: string;
  body: string;
  toAll: boolean;
  createdAt: string;
  recipients: number;
  readCount: number;
  people: Array<{ name: string; email: string; read: boolean }>;
}

/**
 * Mensagens do administrador para quem usa o app. Quem recebe vê uma por vez num pop-up
 * ao abrir o app; o administrador envia e acompanha em Configurações > Administração.
 */
@Injectable({
  providedIn: 'root',
})
export class MessagesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly inbox = signal<InboxMessage[]>([]);
  /** A mensagem da vez (a mais antiga ainda não lida). */
  readonly current = computed(() => this.inbox()[0] ?? null);

  constructor() {
    this.auth.onLogout(() => this.inbox.set([]));
  }

  /** Ao entrar no app. Falha em silêncio: mensagem é bônus, não pode travar nada. */
  async load(): Promise<void> {
    try {
      this.inbox.set(await firstValueFrom(this.http.get<InboxMessage[]>('/api/messages')));
    } catch {
      this.inbox.set([]);
    }
  }

  /** "Entendi": some da tela na hora e fica marcada como lida no servidor. */
  dismiss(): void {
    const message = this.current();
    if (!message) {
      return;
    }
    this.inbox.update((messages) => messages.slice(1));
    firstValueFrom(this.http.post(`/api/messages/${message.id}/read`, {})).catch(() => undefined);
  }

  // ----- administrador -----

  searchUsers(query: string): Promise<AdminUser[]> {
    return firstValueFrom(this.http.get<AdminUser[]>('/api/admin/users', { params: { q: query } }));
  }

  send(to: 'all' | string[], title: string, body: string): Promise<{ sent: number }> {
    return firstValueFrom(this.http.post<{ sent: number }>('/api/admin/messages', { to, title, body }));
  }

  history(): Promise<SentBatch[]> {
    return firstValueFrom(this.http.get<SentBatch[]>('/api/admin/messages'));
  }
}

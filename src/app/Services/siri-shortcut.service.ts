import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface ShortcutKeyInfo {
  active: boolean;
  hint?: string;
  createdAt?: string;
  lastUsedAt?: string | null;
}

/** Um pedido recebido pela Siri: a frase exata que chegou e o resultado. */
export interface ShortcutLogEntry {
  heard: string;
  amount: number | null;
  description: string | null;
  ok: boolean;
  message: string;
  createdAt: string;
}

export interface ShortcutExpensePreview {
  amount: number;
  description: string;
  category: string;
  bucket: { id: string; label: string };
}

/** Chave pessoal do atalho da Siri e o teste de frases (Configurações > Siri e atalhos). */
@Injectable({
  providedIn: 'root',
})
export class SiriShortcutService {
  private readonly http = inject(HttpClient);

  /** Endereço que o atalho do iPhone chama. */
  readonly endpoint = `${window.location.origin}/api/atalho/gasto`;

  keyInfo(): Promise<ShortcutKeyInfo> {
    return firstValueFrom(this.http.get<ShortcutKeyInfo>('/api/atalho/chave'));
  }

  /** A chave completa só vem nesta resposta — o servidor guarda apenas o hash. */
  createKey(): Promise<{ key: string; hint: string; createdAt: string }> {
    return firstValueFrom(this.http.post<{ key: string; hint: string; createdAt: string }>('/api/atalho/chave', {}));
  }

  revokeKey(): Promise<unknown> {
    return firstValueFrom(this.http.delete('/api/atalho/chave'));
  }

  history(): Promise<ShortcutLogEntry[]> {
    return firstValueFrom(this.http.get<ShortcutLogEntry[]>('/api/atalho/historico'));
  }

  preview(texto: string): Promise<ShortcutExpensePreview> {
    return firstValueFrom(this.http.post<ShortcutExpensePreview>('/api/atalho/testar', { texto }));
  }
}

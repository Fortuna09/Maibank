import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

const AUTH_URL = '/api/auth';

/** Mensagem legível de um erro da API (o backend sempre manda `{ message, code? }`). */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
    }
    return error.error?.message ?? fallback;
  }
  return fallback;
}

export function apiErrorCode(error: unknown): string | null {
  return error instanceof HttpErrorResponse ? error.error?.code ?? null : null;
}

/** Só aceita voltar para rotas internas (evita redirecionar para outro site). */
export function safeReturnUrl(value: string | null | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

/**
 * Sessão do usuário. O token fica num cookie httpOnly que o JavaScript não lê;
 * aqui só sabemos *quem* está logado, perguntando ao backend (`/api/auth/session`).
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly statusSignal = signal<AuthStatus>('unknown');
  private sessionLoad?: Promise<void>;
  private readonly logoutHandlers: Array<() => void> = [];

  readonly user = this.userSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.statusSignal() === 'authenticated');
  readonly firstName = computed(() => this.userSignal()?.name.trim().split(/\s+/)[0] ?? '');

  /** Descobre (uma vez) se já existe sessão; os guards esperam isso antes de decidir a rota. */
  ensureSession(): Promise<void> {
    this.sessionLoad ??= firstValueFrom(this.http.get<{ user: AuthUser | null }>(`${AUTH_URL}/session`))
      .then(({ user }) => this.setUser(user))
      .catch(() => this.setUser(null));
    return this.sessionLoad;
  }

  async register(payload: RegisterPayload): Promise<{ email: string; emailSent: boolean }> {
    return firstValueFrom(this.http.post<{ email: string; emailSent: boolean }>(`${AUTH_URL}/register`, payload));
  }

  async login(email: string, password: string): Promise<void> {
    const { user } = await firstValueFrom(this.http.post<{ user: AuthUser }>(`${AUTH_URL}/login`, { email, password }));
    this.setUser(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const { user } = await firstValueFrom(this.http.post<{ user: AuthUser }>(`${AUTH_URL}/verify-email`, { token }));
    this.setUser(user);
  }

  async resendVerification(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${AUTH_URL}/resend-verification`, { email }));
  }

  async forgotPassword(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${AUTH_URL}/forgot-password`, { email }));
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const { user } = await firstValueFrom(this.http.post<{ user: AuthUser }>(`${AUTH_URL}/reset-password`, { token, password }));
    this.setUser(user);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${AUTH_URL}/logout`, {}));
    } finally {
      this.endSession();
      await this.router.navigate(['/entrar']);
    }
  }

  async logoutEverywhere(): Promise<void> {
    await firstValueFrom(this.http.post(`${AUTH_URL}/logout-all`, {}));
    this.endSession();
    await this.router.navigate(['/entrar']);
  }

  /** Quem guarda dados da pessoa no navegador registra aqui como limpar ao sair. */
  onLogout(handler: () => void): void {
    this.logoutHandlers.push(handler);
  }

  /** Chamado pelo interceptor quando a API responde 401: a sessão expirou ou foi derrubada. */
  handleUnauthorized(): void {
    if (this.statusSignal() !== 'authenticated') {
      return;
    }

    const returnUrl = this.router.url;
    this.endSession();
    void this.router.navigate(['/entrar'], { queryParams: returnUrl && returnUrl !== '/' ? { volta: returnUrl } : {} });
  }

  private setUser(user: AuthUser | null): void {
    this.userSignal.set(user);
    this.statusSignal.set(user ? 'authenticated' : 'anonymous');
  }

  private endSession(): void {
    this.setUser(null);
    for (const handler of this.logoutHandlers) {
      handler();
    }
  }
}

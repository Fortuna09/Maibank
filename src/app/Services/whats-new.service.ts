import { computed, inject, Injectable, signal } from '@angular/core';
import { CHANGELOG, compareVersions, CURRENT_RELEASE, Release } from '../Utils/changelog';
import { AuthService } from './auth.service';
import { TourService } from './tour.service';

const SEEN_KEY = 'maibank-seen-version:';
/** Quem ficou muito tempo fora vê no máximo as últimas versões, não o histórico inteiro. */
const MAX_RELEASES_IN_DIALOG = 4;

/** Mostra "o que mudou" uma vez por versão, para cada conta neste navegador. */
@Injectable({
  providedIn: 'root',
})
export class WhatsNewService {
  private readonly auth = inject(AuthService);
  private readonly tour = inject(TourService);

  /** Versões ainda não vistas; com itens, o aviso de novidades aparece. */
  readonly pending = signal<Release[]>([]);
  readonly isOpen = computed(() => this.pending().length > 0);

  constructor() {
    this.auth.onLogout(() => this.pending.set([]));
  }

  /** Chamado ao entrar na área logada. */
  checkOnEnter(): void {
    const user = this.auth.user();
    if (!user) {
      return;
    }

    const seen = this.read(user.id);
    if (!seen) {
      // Conta nova: vai ver o tour, então começa em dia, sem novidades antigas.
      if (!this.tour.hasSeen(user.id)) {
        this.write(user.id, CURRENT_RELEASE.version);
        return;
      }
      // Já usava o app antes das novidades existirem: mostra só a versão atual.
      this.pending.set([CURRENT_RELEASE]);
      return;
    }

    const unseen = CHANGELOG.filter((release) => compareVersions(release.version, seen) > 0);
    this.pending.set(unseen.slice(0, MAX_RELEASES_IN_DIALOG));
  }

  dismiss(): void {
    const user = this.auth.user();
    if (user) {
      this.write(user.id, CURRENT_RELEASE.version);
    }
    this.pending.set([]);
  }

  private read(userId: string): string | null {
    try {
      return localStorage.getItem(SEEN_KEY + userId);
    } catch {
      return null;
    }
  }

  private write(userId: string, version: string): void {
    try {
      localStorage.setItem(SEEN_KEY + userId, version);
    } catch {
      // Sem localStorage as novidades voltam a aparecer na próxima entrada; não é grave.
    }
  }
}

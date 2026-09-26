import { computed, inject, Injectable, signal } from '@angular/core';
import { TourStep, WELCOME_TOUR } from '../Utils/tour-steps';
import { AuthService } from './auth.service';

const SEEN_KEY = 'maibank-tour-seen:';

/** Estado do tour guiado: qual passo está aberto e se a pessoa já o viu. */
@Injectable({
  providedIn: 'root',
})
export class TourService {
  private readonly auth = inject(AuthService);

  readonly steps: TourStep[] = WELCOME_TOUR;
  readonly index = signal<number | null>(null);

  readonly active = computed(() => this.index() !== null);
  readonly current = computed(() => {
    const index = this.index();
    return index === null ? null : this.steps[index];
  });
  readonly isFirst = computed(() => this.index() === 0);
  readonly isLast = computed(() => this.index() === this.steps.length - 1);

  constructor() {
    this.auth.onLogout(() => this.index.set(null));
  }

  start(): void {
    this.index.set(0);
  }

  /** Na primeira entrada da conta neste navegador, abre o tour sozinho. */
  startIfFirstVisit(): void {
    const user = this.auth.user();
    if (!user || this.hasSeen(user.id)) {
      return;
    }
    // Dá tempo da tela inicial montar antes de escurecer tudo.
    window.setTimeout(() => {
      if (!this.active() && this.auth.user()?.id === user.id) {
        this.start();
      }
    }, 800);
  }

  next(): void {
    const index = this.index();
    if (index === null) {
      return;
    }
    if (index >= this.steps.length - 1) {
      this.finish();
    } else {
      this.index.set(index + 1);
    }
  }

  previous(): void {
    const index = this.index();
    if (index !== null && index > 0) {
      this.index.set(index - 1);
    }
  }

  /** Concluir ou pular: não abre mais sozinho para esta conta. */
  finish(): void {
    const user = this.auth.user();
    if (user) {
      try {
        localStorage.setItem(SEEN_KEY + user.id, '1');
      } catch {
        // Sem localStorage o tour só volta a aparecer na próxima entrada.
      }
    }
    this.index.set(null);
  }

  private hasSeen(userId: string): boolean {
    try {
      return localStorage.getItem(SEEN_KEY + userId) === '1';
    } catch {
      return false;
    }
  }
}

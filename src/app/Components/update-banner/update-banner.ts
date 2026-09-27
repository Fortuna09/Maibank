import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { Icon } from '../icon/icon';

/** De quanto em quanto tempo uma aba aberta pergunta se saiu deploy novo. */
const CHECK_EVERY_MS = 30 * 60_000;

/**
 * Avisa quando um deploy novo já foi baixado pelo service worker. A aba aberta segue na versão
 * antiga até recarregar; "Atualizar" troca de versão na hora, e aí o aviso de novidades aparece.
 */
@Component({
  selector: 'app-update-banner',
  imports: [Icon],
  template: `
    @if (available() && !dismissed()) {
      <div class="update-banner" role="status">
        <app-icon name="refresh" [size]="16" />
        <span>Saiu uma versão nova do Maibank.</span>
        <button type="button" class="btn primary small" [class.is-loading]="updating()" [disabled]="updating()" (click)="update()">
          <span>Atualizar</span>
        </button>
        <button type="button" class="btn ghost small icon-btn" (click)="dismissed.set(true)" aria-label="Depois">
          <app-icon name="close" [size]="14" />
        </button>
      </div>
    }
  `,
  styleUrl: './update-banner.scss',
})
export class UpdateBanner {
  private readonly updates = inject(SwUpdate);

  readonly available = signal(false);
  readonly dismissed = signal(false);
  readonly updating = signal(false);

  constructor() {
    // Em desenvolvimento não há service worker: nada a vigiar.
    if (!this.updates.isEnabled) {
      return;
    }

    this.updates.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.available.set(true);
        this.dismissed.set(false);
      });

    // Cache quebrado (arquivos da versão antiga sumiram do servidor): só recarregando.
    this.updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => document.location.reload());

    const check = () => {
      this.updates.checkForUpdate().catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);

    inject(DestroyRef).onDestroy(() => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    });
  }

  async update(): Promise<void> {
    this.updating.set(true);
    try {
      await this.updates.activateUpdate();
    } catch {
      // Mesmo sem ativar, recarregar já busca a versão nova.
    }
    document.location.reload();
  }
}

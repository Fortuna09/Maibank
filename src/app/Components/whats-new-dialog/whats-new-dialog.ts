import { Component, computed, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WhatsNewService } from '../../Services/whats-new.service';
import { Icon } from '../icon/icon';
import { ReleaseNotes } from '../release-notes/release-notes';

/** Aparece uma vez depois de uma atualização, com o que mudou desde a última visita. */
@Component({
  selector: 'app-whats-new-dialog',
  imports: [Icon, ReleaseNotes],
  template: `
    @if (whatsNew.isOpen()) {
      <div class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal-card whats-new" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
          <div class="whats-new-head">
            <span class="whats-new-icon"><app-icon name="bell" [size]="16" /></span>
            <div>
              <h2 id="whats-new-title">O Maibank foi atualizado</h2>
              <p>{{ subtitle() }}</p>
            </div>
          </div>

          <div class="whats-new-body">
            @for (release of whatsNew.pending(); track release.version) {
              <app-release-notes [release]="release" />
            }
          </div>

          <div class="whats-new-actions">
            <button type="button" class="btn ghost" (click)="openHistory()">Ver todas as versões</button>
            <button type="button" class="btn primary" (click)="whatsNew.dismiss()">Entendi</button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './whats-new-dialog.scss',
})
export class WhatsNewDialog {
  readonly whatsNew = inject(WhatsNewService);
  private readonly router = inject(Router);

  readonly subtitle = computed(() =>
    this.whatsNew.pending().length > 1
      ? 'Veja o que mudou desde a última vez que você entrou.'
      : 'Veja o que tem de novo nesta versão.',
  );

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.whatsNew.isOpen()) {
      this.whatsNew.dismiss();
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.whatsNew.dismiss();
    }
  }

  openHistory(): void {
    this.whatsNew.dismiss();
    this.router.navigateByUrl('/configuracoes/novidades');
  }
}

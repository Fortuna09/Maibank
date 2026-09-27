import { Component, HostListener, input, model } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Janelinha no meio da tela para informação de apoio (saldos por tipo, filtros).
 * Fecha tocando fora, no × ou com Esc. O conteúdo vem de quem usa: <app-popup>…</app-popup>.
 */
@Component({
  selector: 'app-popup',
  imports: [Icon],
  template: `
    @if (open()) {
      <div class="modal-overlay is-centered" (click)="onOverlayClick($event)">
        <div class="modal-card popup" role="dialog" aria-modal="true" [attr.aria-label]="title()">
          <div class="popup-head">
            <h3>{{ title() }}</h3>
            <button type="button" class="btn icon-btn small ghost" (click)="open.set(false)" aria-label="Fechar">
              <app-icon name="close" [size]="15" />
            </button>
          </div>
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: `
    .popup {
      width: min(420px, 100%);
      max-height: calc(100dvh - 48px);
      overflow-y: auto;
      padding: var(--space-4);
      animation: popup-in 0.18s cubic-bezier(0.2, 0.9, 0.3, 1) both;
    }

    .popup-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }

    .popup-head h3 {
      margin: 0;
      color: var(--text);
      font-size: 1rem;
      font-weight: 600;
    }

    @keyframes popup-in {
      from {
        opacity: 0;
        transform: scale(0.97);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .popup {
        animation: none;
      }
    }
  `,
})
export class Popup {
  readonly open = model(false);
  readonly title = input.required<string>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.open.set(false);
    }
  }
}

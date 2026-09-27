import { DatePipe } from '@angular/common';
import { Component, computed, HostListener, inject, input } from '@angular/core';
import { MessagesService } from '../../Services/messages.service';
import { TourService } from '../../Services/tour.service';
import { WhatsNewService } from '../../Services/whats-new.service';
import { Icon } from '../icon/icon';

/**
 * Pop-up com a mensagem que o administrador mandou para esta pessoa. Espera o tour e o
 * aviso de novidades saírem da frente; com várias, mostra uma de cada vez.
 * Com `preview`, mostra um rascunho (a tela de Administração usa para "Ver como fica").
 */
@Component({
  selector: 'app-message-dialog',
  imports: [DatePipe, Icon],
  template: `
    @if (shown(); as message) {
      <div class="modal-overlay is-centered" (click)="onOverlayClick($event)">
        <div class="modal-card message" role="dialog" aria-modal="true" aria-labelledby="message-title">
          <div class="message-head">
            <span class="message-icon"><app-icon name="mail" [size]="16" /></span>
            <div>
              <p class="eyebrow">Mensagem do Maibank</p>
              <time [attr.datetime]="message.createdAt">{{ message.createdAt | date: "d 'de' MMM, HH:mm" }}</time>
            </div>
          </div>

          <h2 id="message-title">{{ message.title }}</h2>
          <p class="message-body">{{ message.body }}</p>

          <button type="button" class="btn primary block" (click)="close()">Entendi</button>
        </div>
      </div>
    }
  `,
  styles: `
    .message {
      width: min(420px, 100%);
      max-height: calc(100dvh - 48px);
      overflow-y: auto;
      padding: var(--space-5);
      animation: message-in 0.2s cubic-bezier(0.2, 0.9, 0.3, 1) both;
    }

    .message-head {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }

    .message-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      border: 1px solid color-mix(in srgb, var(--user-tint) 55%, var(--border-strong));
      border-radius: var(--radius);
      color: var(--text);
    }

    time {
      display: block;
      margin-top: 1px;
      color: var(--text-muted);
      font-size: 0.74rem;
    }

    h2 {
      margin: 0 0 var(--space-2);
      color: var(--text);
      font-size: 1.1rem;
      font-weight: 700;
    }

    .message-body {
      margin: 0 0 var(--space-5);
      color: var(--text);
      font-size: 0.9rem;
      line-height: 1.6;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }

    @keyframes message-in {
      from {
        opacity: 0;
        transform: scale(0.97);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .message {
        animation: none;
      }
    }
  `,
})
export class MessageDialog {
  private readonly messages = inject(MessagesService);
  private readonly whatsNew = inject(WhatsNewService);
  private readonly tour = inject(TourService);

  /** Rascunho para pré-visualizar. Um pop-up de pré-visualização nunca mostra a caixa de entrada. */
  readonly preview = input<{ title: string; body: string; createdAt: string } | null | undefined>(undefined);
  /** Chamado ao fechar a pré-visualização. */
  readonly closePreview = input<() => void>(() => undefined);

  readonly shown = computed(() => {
    const draft = this.preview();
    if (draft !== undefined) {
      return draft;
    }
    const message = this.messages.current();
    return message && !this.whatsNew.isOpen() && !this.tour.active() ? message : null;
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.shown()) {
      this.close();
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    if (this.preview() !== undefined) {
      this.closePreview()();
    } else {
      this.messages.dismiss();
    }
  }
}

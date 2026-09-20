import { DatePipe } from '@angular/common';
import { Component, effect, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { MaiMark } from '../mai-mark/mai-mark';
import { AssistantService } from '../../Services/assistant.service';
import { ASSISTANT_NAME } from '../../Utils/assistant-prompt';

const SUGGESTIONS = [
  'Gastei 45 no mercado',
  'Comprei um fone de 300 em 3x no cartão',
  'Quero juntar 5 mil pra viagem até dezembro',
  'Simula um notebook de 4 mil em 10x',
];

/**
 * Painel lateral da assistente, estilo chat do Copilot: sobrepõe a tela pela direita,
 * minimiza para uma pílula e expande para ficar mais largo. Montado uma vez em app.html.
 */
@Component({
  selector: 'app-assistant-panel',
  imports: [FormsModule, DatePipe, RouterLink, Icon, MaiMark],
  templateUrl: './assistant-panel.html',
  styleUrl: './assistant-panel.scss',
})
export class AssistantPanel {
  readonly assistant = inject(AssistantService);
  readonly name = ASSISTANT_NAME;
  readonly suggestions = SUGGESTIONS;

  readonly draft = signal('');

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');

  constructor() {
    // Rola para a última mensagem sempre que a conversa muda ou o painel abre.
    effect(() => {
      this.assistant.messages();
      this.assistant.thinking();
      const visible = this.assistant.isVisible();
      const element = this.scroller()?.nativeElement;
      if (visible && element) {
        requestAnimationFrame(() => element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' }));
      }
    });

    effect(() => {
      if (this.assistant.isVisible()) {
        requestAnimationFrame(() => this.composer()?.nativeElement.focus());
      }
    });
  }

  /** Ctrl+I abre/fecha, como o chat do Copilot no VS Code. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      this.assistant.toggle();
    }
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  onComposerInput(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }

  useSuggestion(text: string): void {
    this.draft.set(text);
    this.composer()?.nativeElement.focus();
  }

  submit(): void {
    const text = this.draft().trim();
    if (!text || this.assistant.thinking()) {
      return;
    }
    this.draft.set('');
    const textarea = this.composer()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }
    void this.assistant.send(text);
  }

  actionLabel(type: string): string {
    return type === 'add_transaction' ? 'Lançamento' : type === 'create_goal' ? 'Meta' : 'Simulação';
  }
}

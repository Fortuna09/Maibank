import { Component, effect, inject, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { FeedbackService } from '../../Services/feedback.service';

type BarState = 'idle' | 'running' | 'complete';

/**
 * Camada global de feedback: barra de progresso no topo enquanto algo salva
 * e pilha de toasts no canto. Montada uma vez em app.html.
 */
@Component({
  selector: 'app-feedback-layer',
  imports: [Icon],
  templateUrl: './feedback-layer.html',
  styleUrl: './feedback-layer.scss',
})
export class FeedbackLayer {
  readonly feedback = inject(FeedbackService);
  readonly barState = signal<BarState>('idle');

  private completeTimer?: number;

  constructor() {
    effect(() => {
      const busy = this.feedback.busy();
      window.clearTimeout(this.completeTimer);

      if (busy) {
        this.barState.set('running');
        return;
      }

      // Ao terminar, a barra completa até o fim e some — em vez de sumir no meio.
      if (this.barState() === 'running') {
        this.barState.set('complete');
        this.completeTimer = window.setTimeout(() => this.barState.set('idle'), 420);
      }
    });
  }
}

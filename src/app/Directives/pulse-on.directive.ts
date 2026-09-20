import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/**
 * Reinicia uma animação curta no elemento sempre que o valor observado muda —
 * usado para o usuário perceber que um resultado foi recalculado.
 *
 * Uso: <section [appPulseOn]="result()">
 */
@Directive({
  selector: '[appPulseOn]',
  host: { class: 'pulse-target' },
})
export class PulseOnDirective {
  readonly appPulseOn = input<unknown>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private first = true;

  constructor() {
    effect(() => {
      this.appPulseOn();

      // A primeira renderização já entra com a animação de página; não repete.
      if (this.first) {
        this.first = false;
        return;
      }

      const element = this.host.nativeElement;
      element.classList.remove('is-pulsing');
      // Força o navegador a fechar a animação anterior antes de recomeçar.
      void element.offsetWidth;
      element.classList.add('is-pulsing');
    });
  }
}

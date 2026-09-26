import { Component, input, output } from '@angular/core';
import { AmountMode } from '../../Utils/finance.utils';

/**
 * Seletor compacto "total | parcela" que fica no cabeçalho do campo de valor.
 * Quem usa decide o que fazer ao trocar (normalmente converter o valor já digitado).
 */
@Component({
  selector: 'app-amount-mode-switch',
  template: `
    <span class="amount-switch" role="radiogroup" aria-label="Como informar o valor">
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="mode() === 'total'"
        [class.active]="mode() === 'total'"
        (click)="select('total')"
        title="Informar o valor cheio da compra"
      >
        total
      </button>
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="mode() === 'parcela'"
        [class.active]="mode() === 'parcela'"
        (click)="select('parcela')"
        title="Informar só o valor de cada parcela — com juros, o total já sai certo"
      >
        parcela
      </button>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .amount-switch {
        display: inline-flex;
        gap: 1px;
        padding: 1px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
      }

      button {
        padding: 1px 7px;
        border: 0;
        border-radius: 2px;
        background: transparent;
        color: var(--text-muted);
        font: inherit;
        font-size: 0.66rem;
        font-weight: 700;
        line-height: 1.5;
        cursor: pointer;
        transition: background 0.14s ease, color 0.14s ease;
      }

      button:hover {
        color: var(--text);
      }

      button.active {
        background: var(--bg);
        color: var(--text);
        box-shadow: inset 0 -1px 0 var(--user-tint);
      }
    `,
  ],
})
export class AmountModeSwitch {
  readonly mode = input<AmountMode>('total');
  readonly modeChange = output<AmountMode>();

  select(mode: AmountMode): void {
    if (mode !== this.mode()) {
      this.modeChange.emit(mode);
    }
  }
}

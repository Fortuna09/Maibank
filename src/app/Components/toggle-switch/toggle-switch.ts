import { Component, input, model } from '@angular/core';

/**
 * Interruptor liga/desliga. Mesmo desenho reto do resto do app (raio de 3px):
 * o marcador desliza e o trilho acende na cor de destaque quando ligado.
 */
@Component({
  selector: 'app-toggle-switch',
  template: `
    <button
      type="button"
      role="switch"
      class="switch"
      [class.on]="checked()"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      (click)="checked.set(!checked())"
    >
      <span class="thumb"></span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-shrink: 0;
      }

      .switch {
        position: relative;
        width: 40px;
        height: 22px;
        padding: 0;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius);
        background: var(--surface-alt);
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease;
      }

      .switch:focus-visible {
        outline: 2px solid var(--user-tint);
        outline-offset: 2px;
      }

      .thumb {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 14px;
        height: 14px;
        border-radius: 2px;
        background: var(--text-muted);
        transition: transform 0.24s cubic-bezier(0.3, 1.5, 0.5, 1), background 0.2s ease;
      }

      .switch.on {
        border-color: var(--user-tint);
        background: color-mix(in srgb, var(--user-tint) 28%, var(--surface-alt));
      }

      .switch.on .thumb {
        transform: translateX(18px);
        background: var(--user-tint);
      }

      @media (prefers-reduced-motion: reduce) {
        .switch,
        .thumb {
          transition: none;
        }
      }
    `,
  ],
})
export class ToggleSwitch {
  readonly checked = model(false);
  readonly label = input('');
}

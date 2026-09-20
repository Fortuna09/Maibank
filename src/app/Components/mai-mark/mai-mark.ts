import { Component, input } from '@angular/core';

/**
 * O símbolo da Mai: cinco barras de voz, como um indicador de "ouvindo".
 * Em repouso balançam devagar; com `active` (pensando/respondendo) dançam.
 * Pensado para quando ela ganhar voz — o mesmo símbolo vira o medidor de fala.
 */
@Component({
  selector: 'app-mai-mark',
  template: `
    <span class="mai-mark" [class.is-active]="active()" [style.width.px]="size()" [style.height.px]="size()" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        line-height: 0;
      }

      .mai-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9%;
      }

      .mai-mark i {
        display: block;
        width: 11%;
        height: 100%;
        border-radius: 999px;
        background: var(--mai);
        transform-origin: 50% 50%;
        transform: scaleY(var(--rest, 0.3));
        animation: mai-idle 4.2s ease-in-out infinite;
      }

      /* Perfil em repouso: um "monte" suave no meio */
      .mai-mark i:nth-child(1) { --rest: 0.28; animation-delay: 0s; }
      .mai-mark i:nth-child(2) { --rest: 0.5; animation-delay: 0.3s; }
      .mai-mark i:nth-child(3) { --rest: 0.72; animation-delay: 0.6s; }
      .mai-mark i:nth-child(4) { --rest: 0.5; animation-delay: 0.9s; }
      .mai-mark i:nth-child(5) { --rest: 0.28; animation-delay: 1.2s; }

      /* Pensando: dança de equalizador */
      .is-active i {
        animation: mai-dance 0.9s ease-in-out infinite;
      }

      .is-active i:nth-child(1) { animation-delay: 0s; }
      .is-active i:nth-child(2) { animation-delay: 0.12s; }
      .is-active i:nth-child(3) { animation-delay: 0.24s; }
      .is-active i:nth-child(4) { animation-delay: 0.36s; }
      .is-active i:nth-child(5) { animation-delay: 0.48s; }

      @keyframes mai-idle {
        0%,
        100% {
          transform: scaleY(var(--rest));
        }
        50% {
          transform: scaleY(calc(var(--rest) * 0.72 + 0.1));
        }
      }

      @keyframes mai-dance {
        0%,
        100% {
          transform: scaleY(0.25);
        }
        50% {
          transform: scaleY(1);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .mai-mark i,
        .is-active i {
          animation: none;
        }
      }
    `,
  ],
})
export class MaiMark {
  readonly size = input<number>(18);
  readonly active = input<boolean>(false);
}

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name()) {
        @case ('home') {
          <path d="M3 10.6 12 3.2l9 7.4" />
          <path d="M5.6 9.6V20.8h12.8V9.6" />
        }
        @case ('wallet') {
          <path d="M4 7.6h13.2a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H5.6a1.6 1.6 0 0 1-1.6-1.6z" />
          <path d="M4 7.6V6.4a1.6 1.6 0 0 1 1.6-1.6h10" />
          <path d="M15.6 13.4h3.6" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" />
        }
        @case ('target') {
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="1.2" />
        }
        @case ('list') {
          <path d="M9 7h11M9 12h11M9 17h11" />
          <circle cx="4.6" cy="7" r="1" />
          <circle cx="4.6" cy="12" r="1" />
          <circle cx="4.6" cy="17" r="1" />
        }
        @case ('sliders') {
          <path d="M4 8h10M18.5 8H20M4 16h4M12.5 16H20" />
          <circle cx="16" cy="8" r="2.2" />
          <circle cx="10" cy="16" r="2.2" />
        }
        @case ('car') {
          <path d="M4 14.4 5.7 9.6a2 2 0 0 1 1.9-1.3h8.8a2 2 0 0 1 1.9 1.3L20 14.4v3.4a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-.9H7.4v.9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
          <path d="M4.4 14.4h15.2" />
          <circle cx="7.8" cy="16.9" r="0.1" />
          <circle cx="16.2" cy="16.9" r="0.1" />
        }
        @case ('shield') {
          <path d="M12 3.4 19 6.2v5.3c0 4.2-2.8 7.4-7 8.8-4.2-1.4-7-4.6-7-8.8V6.2z" />
          <path d="M9.2 12.1l1.9 2 3.7-3.9" />
        }
        @case ('rocket') {
          <path d="M12 3.2c2.9 2.1 4.4 5 4.4 8.5L12 16.2l-4.4-4.5c0-3.5 1.5-6.4 4.4-8.5z" />
          <circle cx="12" cy="10" r="1.6" />
          <path d="M9.4 15.6c-1.3 1-1.8 2.6-1.6 5.2 2.3-.2 3.8-1 4.6-2.4M14.6 15.6c1.3 1 1.8 2.6 1.6 5.2-2.3-.2-3.8-1-4.6-2.4" />
        }
        @case ('bag') {
          <path d="M5.8 8.4h12.4l-1 11.2a1 1 0 0 1-1 .9H7.8a1 1 0 0 1-1-.9z" />
          <path d="M9.4 8.4V6.8a2.6 2.6 0 0 1 5.2 0v1.6" />
        }
        @case ('trend-up') {
          <path d="M4 16.4 9.4 11l3.2 3.2 6.2-6.2" />
          <path d="M14.6 8h4.2v4.2" />
        }
        @case ('arrow-in') {
          <path d="M7.4 16.6 16.6 7.4" />
          <path d="M9 7.4h7.6V15" />
        }
        @case ('arrow-out') {
          <path d="M7.4 7.4 16.6 16.6" />
          <path d="M16.6 9v7.6H9" />
        }
        @case ('trash') {
          <path d="M4.8 7.2h14.4" />
          <path d="M9.4 7.2V5.6a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v1.6" />
          <path d="M7 7.2 7.9 19a1 1 0 0 0 1 .9h6.2a1 1 0 0 0 1-.9l.9-11.8" />
        }
        @case ('sparkle') {
          <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
          <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
        }
        @case ('send') {
          <path d="M4.5 12 20 4.5 16.5 20l-4.5-6.5z" />
          <path d="M12 13.5 20 4.5" />
        }
        @case ('minus') {
          <path d="M5.6 12h12.8" />
        }
        @case ('close') {
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
        }
        @case ('expand') {
          <path d="M14 4.5h5.5V10M10 19.5H4.5V14M19.5 4.5 13.5 10.5M4.5 19.5l6-6" />
        }
        @case ('shrink') {
          <path d="M10 4.5V10H4.5M14 19.5V14h5.5M10 10 4.5 4.5M14 14l5.5 5.5" />
        }
        @case ('card') {
          <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
          <path d="M3 10h18M7 15h3.5" />
        }
        @case ('plus') {
          <path d="M12 5.6v12.8M5.6 12h12.8" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="6.2" />
          <path d="M15.6 15.6 20 20" />
        }
        @case ('calendar') {
          <rect x="4" y="5.8" width="16" height="14.2" rx="1.6" />
          <path d="M4 10.2h16M8.6 3.8v3.4M15.4 3.8v3.4" />
        }
        @case ('chevron-left') {
          <path d="M14.2 6.6 8.8 12l5.4 5.4" />
        }
        @case ('chevron-right') {
          <path d="M9.8 6.6 15.2 12l-5.4 5.4" />
        }
        @case ('check') {
          <path d="M5.2 12.6 9.8 17.2 18.8 7.4" />
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="8.2" />
          <path d="M12 7.8v4.8" />
          <circle cx="12" cy="16" r="0.1" />
        }
        @case ('inbox') {
          <path d="M4 12.8h4.2l1.4 2.8h4.8l1.4-2.8H20" />
          <path d="M4 12.8 6.6 6.2a1 1 0 0 1 .9-.6h9a1 1 0 0 1 .9.6L20 12.8v5a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 17.8z" />
        }
        @case ('flag') {
          <path d="M6.2 20.4V4.2" />
          <path d="M6.2 5h10.6l-1.9 3.4 1.9 3.4H6.2" />
        }
        @case ('image') {
          <rect x="4" y="5.4" width="16" height="13.2" rx="1.6" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m4.8 17.2 4.6-4.4 3.2 3 2.6-2.4 4 3.8" />
        }
        @case ('eye') {
          <path d="M2.8 12S6.4 5.8 12 5.8 21.2 12 21.2 12 17.6 18.2 12 18.2 2.8 12 2.8 12z" />
          <circle cx="12" cy="12" r="2.8" />
        }
        @case ('eye-off') {
          <path d="M4.4 4.4 19.6 19.6" />
          <path d="M9.6 6.3A8.6 8.6 0 0 1 12 6c5.6 0 9.2 6 9.2 6a15.6 15.6 0 0 1-3.2 3.8M6.5 8.2A15.9 15.9 0 0 0 2.8 12S6.4 18 12 18a8.9 8.9 0 0 0 3-.5" />
          <path d="M10.2 10.3a2.8 2.8 0 0 0 3.7 3.8" />
        }
        @default {
          <circle cx="12" cy="12" r="7.6" />
        }
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
    `,
  ],
})
export class Icon {
  readonly name = input<string>('default');
  readonly size = input<number>(18);
}

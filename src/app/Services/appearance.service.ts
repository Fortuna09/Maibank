import { Injectable, signal } from '@angular/core';

/** Os dois temas são cromados (src/theme-chrome.scss): claro (padrão) e escuro. */
export type Theme = 'light' | 'dark';

/** Cor da barra do sistema/navegador no celular: o topo da barra superior de cada tema. */
const THEME_COLORS: Record<Theme, string> = {
  light: '#eceef0',
  dark: '#2b2c30',
};

const DEFAULT_THEME: Theme = 'light';
/**
 * Na 2.0 todo mundo passou para o cromado uma vez; depois disso, vale o que a pessoa escolher.
 * (Antes o tema era salvo sempre, então não dá para saber quem escolheu o escuro de propósito.)
 */
const THEME_MIGRATION_KEY = 'maibank-theme-v2';

/** "chrome" (nome antigo do cromado claro) e qualquer valor desconhecido viram o claro. */
function parseTheme(value: string | null): Theme {
  return value === 'dark' ? 'dark' : DEFAULT_THEME;
}

@Injectable({ providedIn: 'root' })
export class AppearanceService {
  theme: Theme = DEFAULT_THEME;

  readonly userName = signal('');
  readonly coverImage = signal<string | null>(null);
  readonly coverPositionX = signal(50);
  readonly coverPositionY = signal(50);
  readonly coverZoom = signal(100);

  initialize(): void {
    if (localStorage.getItem(THEME_MIGRATION_KEY) !== '1') {
      localStorage.setItem('maibank-theme', DEFAULT_THEME);
      localStorage.setItem(THEME_MIGRATION_KEY, '1');
    }
    this.theme = parseTheme(localStorage.getItem('maibank-theme'));
    this.applyTheme(this.theme);

    this.userName.set(localStorage.getItem('maibank-user-name') || '');
    this.coverImage.set(localStorage.getItem('maibank-cover-image'));
    this.coverPositionX.set(Number(localStorage.getItem('maibank-cover-x')) || 50);
    this.coverPositionY.set(Number(localStorage.getItem('maibank-cover-y')) || 50);
    this.coverZoom.set(Number(localStorage.getItem('maibank-cover-zoom')) || 100);
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.applyTheme(theme);
  }

  setUserName(name: string): void {
    this.userName.set(name);
    if (name.trim()) {
      localStorage.setItem('maibank-user-name', name);
    } else {
      localStorage.removeItem('maibank-user-name');
    }
  }

  selectCoverImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const image = typeof reader.result === 'string' ? reader.result : null;
      if (image) {
        this.coverImage.set(image);
        localStorage.setItem('maibank-cover-image', image);
        this.setCoverPosition(50, 50);
        this.setCoverZoom(100);
      }
    });
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearCoverImage(): void {
    this.coverImage.set(null);
    localStorage.removeItem('maibank-cover-image');
    this.setCoverPosition(50, 50);
    this.setCoverZoom(100);
  }

  setCoverPosition(x: number, y: number): void {
    const clampedX = Math.min(100, Math.max(0, Math.round(x)));
    const clampedY = Math.min(100, Math.max(0, Math.round(y)));
    this.coverPositionX.set(clampedX);
    this.coverPositionY.set(clampedY);
    localStorage.setItem('maibank-cover-x', String(clampedX));
    localStorage.setItem('maibank-cover-y', String(clampedY));
  }

  setCoverZoom(zoom: number): void {
    const clamped = Math.min(200, Math.max(100, Math.round(zoom)));
    this.coverZoom.set(clamped);
    localStorage.setItem('maibank-cover-zoom', String(clamped));
  }

  private applyTheme(nextTheme: Theme): void {
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('maibank-theme', nextTheme);
    // Barra do navegador/sistema no celular acompanha o topo do app.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[nextTheme]);
  }

}

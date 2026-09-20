import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const DEFAULT_ACCENT = '#3b82f6';

@Injectable({ providedIn: 'root' })
export class AppearanceService {
  theme: Theme = 'dark';
  accentColor = DEFAULT_ACCENT;

  readonly userName = signal('');
  readonly coverImage = signal<string | null>(null);
  readonly coverPositionX = signal(50);
  readonly coverPositionY = signal(50);
  readonly coverZoom = signal(100);

  initialize(): void {
    const savedTheme = localStorage.getItem('maibank-theme') as Theme | null;
    this.theme = savedTheme === 'light' ? 'light' : 'dark';
    this.applyTheme(this.theme);

    this.accentColor = localStorage.getItem('maibank-accent-color') || DEFAULT_ACCENT;
    this.applyAccentColor(this.accentColor);

    this.userName.set(localStorage.getItem('maibank-user-name') || '');
    this.coverImage.set(localStorage.getItem('maibank-cover-image'));
    this.coverPositionX.set(Number(localStorage.getItem('maibank-cover-x')) || 50);
    this.coverPositionY.set(Number(localStorage.getItem('maibank-cover-y')) || 50);
    this.coverZoom.set(Number(localStorage.getItem('maibank-cover-zoom')) || 100);
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.theme);
  }

  setAccentColor(color: string): void {
    this.accentColor = color;
    localStorage.setItem('maibank-accent-color', color);
    this.applyAccentColor(color);
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
  }

  private applyAccentColor(color: string): void {
    document.documentElement.style.setProperty('--user-tint', color);
  }
}

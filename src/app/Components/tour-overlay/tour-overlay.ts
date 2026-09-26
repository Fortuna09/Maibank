import { Component, DestroyRef, effect, ElementRef, HostListener, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TourService } from '../../Services/tour.service';
import { TourStep } from '../../Utils/tour-steps';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOT_PADDING = 6;
const GAP = 14;
const EDGE = 12;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Tour guiado: escurece a tela, recorta um destaque em volta do elemento do passo
 * (sombra gigante de um retângulo) e posiciona o balão ao lado. O destaque desliza
 * de um alvo para o outro; sem alvo, ele encolhe no centro e a tela fica toda escura.
 */
@Component({
  selector: 'app-tour-overlay',
  templateUrl: './tour-overlay.html',
  styleUrl: './tour-overlay.scss',
})
export class TourOverlay {
  readonly tour = inject(TourService);
  private readonly router = inject(Router);

  readonly spot = signal<Box | null>(null);
  readonly cardPosition = signal<{ top: number; left: number } | null>(null);
  /** Só depois da primeira posição o balão aparece e passa a deslizar entre os passos. */
  readonly cardVisible = signal(false);

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  private target: Element | null = null;
  private focusRun = 0;

  constructor() {
    effect(() => {
      const step = this.tour.current();
      untracked(() => (step ? void this.focus(step) : this.reset()));
    });

    // O layout pode mudar enquanto o tour está aberto (dados chegando, menu recolhido).
    const timer = window.setInterval(() => this.tour.active() && this.measure(), 400);
    inject(DestroyRef).onDestroy(() => window.clearInterval(timer));
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    if (this.tour.active()) {
      this.measure();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.tour.active()) {
      return;
    }
    if (event.key === 'Escape') {
      this.tour.finish();
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault();
      this.tour.next();
    } else if (event.key === 'ArrowLeft') {
      this.tour.previous();
    }
  }

  private async focus(step: TourStep): Promise<void> {
    const run = ++this.focusRun;

    if (step.route && this.router.url.split('?')[0] !== step.route) {
      await this.router.navigateByUrl(step.route);
    }

    this.target = step.target ? await this.findTarget(step.target, run) : null;
    if (run !== this.focusRun) {
      return;
    }

    this.target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Mede já e de novo depois da rolagem suave terminar.
    this.measure();
    await wait(350);
    if (run === this.focusRun) {
      this.measure();
    }
  }

  /** As telas são carregadas sob demanda: espera o alvo aparecer (até ~2 s). */
  private async findTarget(selector: string, run: number): Promise<Element | null> {
    for (let attempt = 0; attempt < 20 && run === this.focusRun; attempt++) {
      const element = document.querySelector(selector);
      if (element && element.getBoundingClientRect().width > 0) {
        return element;
      }
      await wait(100);
    }
    return null;
  }

  private measure(): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = this.target?.getBoundingClientRect();

    const spot: Box | null =
      rect && rect.width > 0
        ? {
            top: rect.top - SPOT_PADDING,
            left: rect.left - SPOT_PADDING,
            width: rect.width + SPOT_PADDING * 2,
            height: rect.height + SPOT_PADDING * 2,
          }
        : null;
    this.spot.set(spot);

    // Balão: posiciona depois de renderizar, quando já dá para saber o tamanho dele.
    requestAnimationFrame(() => {
      const card = this.card()?.nativeElement;
      const cardWidth = card?.offsetWidth ?? 320;
      const cardHeight = card?.offsetHeight ?? 180;
      this.cardPosition.set(this.placeCard(spot, cardWidth, cardHeight, viewportWidth, viewportHeight));
      if (!this.cardVisible()) {
        requestAnimationFrame(() => this.cardVisible.set(true));
      }
    });
  }

  private placeCard(spot: Box | null, width: number, height: number, vw: number, vh: number): { top: number; left: number } {
    const clampLeft = (left: number) => Math.min(Math.max(EDGE, left), vw - width - EDGE);
    const clampTop = (top: number) => Math.min(Math.max(EDGE, top), vh - height - EDGE);

    if (!spot) {
      return { top: clampTop((vh - height) / 2), left: clampLeft((vw - width) / 2) };
    }

    // Itens da barra lateral: o balão vai à direita.
    const spaceRight = vw - (spot.left + spot.width);
    if (spot.left + spot.width < vw * 0.35 && spaceRight >= width + GAP + EDGE) {
      return { top: clampTop(spot.top + spot.height / 2 - height / 2), left: spot.left + spot.width + GAP };
    }

    const below = spot.top + spot.height + GAP;
    if (below + height + EDGE <= vh) {
      return { top: below, left: clampLeft(spot.left) };
    }

    const above = spot.top - height - GAP;
    if (above >= EDGE) {
      return { top: above, left: clampLeft(spot.left) };
    }

    // Alvo grande demais para caber o balão fora dele: fica por cima, no rodapé.
    return { top: vh - height - EDGE, left: clampLeft((vw - width) / 2) };
  }

  private reset(): void {
    this.focusRun++;
    this.target = null;
    this.spot.set(null);
    this.cardPosition.set(null);
    this.cardVisible.set(false);
  }
}

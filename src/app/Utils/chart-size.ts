import { DestroyRef, effect, ElementRef, inject, Signal, signal } from '@angular/core';

/**
 * Largura de um elemento como signal, atualizada quando a tela muda (girar o celular,
 * redimensionar a janela). Os gráficos leem este signal para redesenhar no tamanho novo.
 * Precisa ser criado no contexto de injeção (campo ou construtor do componente).
 */
export function elementWidth(target: () => ElementRef<Element> | undefined): Signal<number> {
  const width = signal(0);
  let observer: ResizeObserver | null = null;

  effect(() => {
    const element = target()?.nativeElement;
    observer?.disconnect();
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    observer = new ResizeObserver((entries) => width.set(Math.round(entries[0].contentRect.width)));
    observer.observe(element);
  });

  inject(DestroyRef).onDestroy(() => observer?.disconnect());
  return width.asReadonly();
}

/**
 * Faz o SVG usar pixels de verdade (viewBox = tamanho na tela): o texto do gráfico fica com
 * o mesmo tamanho no celular e no computador, em vez de encolher junto com o desenho.
 */
export function fitChart(canvas: SVGSVGElement, fallback: { width: number; height: number }): { width: number; height: number } {
  const width = Math.round(canvas.clientWidth) || fallback.width;
  const height = Math.round(canvas.clientHeight) || fallback.height;
  canvas.setAttribute('viewBox', `0 0 ${width} ${height}`);
  return { width, height };
}

/** De quantos em quantos rótulos mostrar para cada um ter pelo menos `minGap` pixels. */
export function labelStep(count: number, availableWidth: number, minGap = 56): number {
  const fits = Math.max(2, Math.floor(availableWidth / minGap));
  return Math.max(1, Math.ceil(count / fits));
}

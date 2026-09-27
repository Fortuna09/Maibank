import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/**
 * Numa fileira de abas que rola para o lado (celular), traz a aba ativa para o meio.
 * Sem isso, entrar direto em "Novidades" deixaria a aba marcada fora da tela.
 *
 * Observa a classe `active-tab` em vez dos eventos do roteador: o RouterLinkActive marca
 * a aba um pouco depois da navegação, e é só aí que dá para medir.
 */
@Directive({
  selector: '[appScrollActiveTab]',
})
export class ScrollActiveTabDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private lastActive: Element | null = null;
  private firstReveal = true;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const nav = this.host.nativeElement;
      const observer = new MutationObserver(() => this.reveal());
      observer.observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
      destroyRef.onDestroy(() => observer.disconnect());
      this.reveal();
    });
  }

  private reveal(): void {
    const nav = this.host.nativeElement;
    const active = nav.querySelector('.active-tab');
    if (!active || active === this.lastActive) {
      return;
    }
    this.lastActive = active;

    if (nav.scrollWidth <= nav.clientWidth) {
      return;
    }

    const navBox = nav.getBoundingClientRect();
    const tabBox = active.getBoundingClientRect();
    const offset = tabBox.left - navBox.left - (navBox.width - tabBox.width) / 2;
    // Ao abrir a tela já posiciona; trocando de aba, desliza.
    nav.scrollBy({ left: offset, behavior: this.firstReveal ? 'auto' : 'smooth' });
    this.firstReveal = false;
  }
}

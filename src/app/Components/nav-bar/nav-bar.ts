import { Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppearanceService } from '../../Services/appearance.service';
import { AssistantService } from '../../Services/assistant.service';
import { TourService } from '../../Services/tour.service';
import { APP_VERSION } from '../../Utils/changelog';
import { Icon } from '../icon/icon';
import { MaiMark } from '../mai-mark/mai-mark';

/** Título da barra superior no celular, pela primeira parte da rota. */
const SECTION_TITLES: Record<string, string> = {
  lancamentos: 'Lançamentos',
  metas: 'Metas',
  credito: 'Crédito',
  simulacao: 'Simulação',
  configuracoes: 'Configurações',
};

/**
 * Navegação principal. No computador é a barra lateral; no celular vira uma barra superior
 * (título da seção + ajuda, Mai e configurações) e uma barra de abas fixa embaixo.
 */
@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive, Icon, MaiMark],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})
export class NavBar implements OnInit {
  readonly appearance = inject(AppearanceService);
  readonly assistant = inject(AssistantService);
  readonly tour = inject(TourService);
  private readonly router = inject(Router);

  readonly version = APP_VERSION;
  isMenuOpen = true;

  readonly sectionTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.titleFor(this.router.url)),
    ),
    { initialValue: this.titleFor(this.router.url) },
  );

  ngOnInit(): void {
    this.isMenuOpen = localStorage.getItem('maibank-menu-open') !== 'false';
    this.appearance.initialize();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    localStorage.setItem('maibank-menu-open', String(this.isMenuOpen));
  }

  private titleFor(url: string): string {
    const section = url.split(/[/?#]/)[1] ?? '';
    return SECTION_TITLES[section] ?? 'Maibank';
  }
}

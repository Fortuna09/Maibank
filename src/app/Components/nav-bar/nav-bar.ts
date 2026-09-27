import { Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppearanceService } from '../../Services/appearance.service';
import { AssistantService } from '../../Services/assistant.service';
import { TourService } from '../../Services/tour.service';
import { APP_VERSION } from '../../Utils/changelog';
import { settingsSection } from '../../Utils/settings-sections';
import { Icon } from '../icon/icon';
import { MaiMark } from '../mai-mark/mai-mark';

interface TopbarState {
  title: string;
  /** Para onde o "‹" leva; sem ele, é uma tela de primeiro nível. */
  back: string | null;
}

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

  readonly topbar = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.topbarFor(this.router.url)),
    ),
    { initialValue: this.topbarFor(this.router.url) },
  );

  ngOnInit(): void {
    this.isMenuOpen = localStorage.getItem('maibank-menu-open') !== 'false';
    this.appearance.initialize();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    localStorage.setItem('maibank-menu-open', String(this.isMenuOpen));
  }

  private topbarFor(url: string): TopbarState {
    const [, section = '', child = ''] = url.split(/[?#]/)[0].split('/');

    // Dentro de Configurações, cada seção é uma "página" com volta para o menu
    const settings = section === 'configuracoes' ? settingsSection(child) : undefined;
    if (settings) {
      return { title: settings.label, back: '/configuracoes' };
    }
    return { title: SECTION_TITLES[section] ?? 'Maibank', back: null };
  }
}

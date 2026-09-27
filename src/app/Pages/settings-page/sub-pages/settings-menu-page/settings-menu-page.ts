import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../Components/icon/icon';
import { MaiMark } from '../../../../Components/mai-mark/mai-mark';
import { AuthService } from '../../../../Services/auth.service';
import { APP_VERSION } from '../../../../Utils/changelog';
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, SettingsSection } from '../../../../Utils/settings-sections';

/**
 * Configurações no celular: todas as seções à vista, em lista (como os Ajustes do iPhone).
 * As abas que rolam para o lado escondiam metade das opções.
 */
@Component({
  selector: 'app-settings-menu-page',
  imports: [RouterLink, Icon, MaiMark],
  template: `
    @for (group of groups; track group.id) {
      <section class="section">
        <div class="section-head">
          <h2>{{ group.label }}</h2>
        </div>

        <nav class="menu" [attr.aria-label]="group.label">
          @for (item of sectionsIn(group.id); track item.path) {
            <a class="menu-row" [routerLink]="item.path">
              <span class="row-icon" [class.is-mai]="item.icon === 'mai'">
                @if (item.icon === 'mai') {
                  <app-mai-mark [size]="15" />
                } @else {
                  <app-icon [name]="item.icon" [size]="16" />
                }
              </span>
              <span class="row-body">
                <span class="row-title">{{ item.label }}</span>
                <small class="row-sub">{{ descriptionFor(item) }}</small>
              </span>
              @if (item.path === 'novidades') {
                <span class="tag">v{{ version }}</span>
              }
              <app-icon class="chevron" name="chevron-right" [size]="16" />
            </a>
          }
        </nav>
      </section>
    }

    <p class="menu-foot">Maibank · versão {{ version }}</p>
  `,
  styles: `
    .menu {
      display: flex;
      flex-direction: column;
    }

    .menu-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: 62px;
      padding: 10px 4px;
      border-bottom: 1px solid var(--border);
      color: inherit;
      text-decoration: none;
      transition: background 0.12s ease;
    }

    .menu-row:last-child {
      border-bottom: 0;
    }

    .menu-row:active {
      background: var(--hover);
    }

    .row-icon.is-mai {
      color: var(--mai);
      background: var(--mai-soft);
    }

    .row-title {
      display: block;
    }

    .chevron {
      display: inline-flex;
      color: var(--text-muted);
    }

    .menu-foot {
      margin: var(--space-5) 0 0;
      color: var(--text-muted);
      font-size: 0.74rem;
      text-align: center;
    }
  `,
})
export class SettingsMenuPage {
  private readonly auth = inject(AuthService);

  readonly groups = SETTINGS_GROUPS;
  readonly version = APP_VERSION;

  sectionsIn(group: string): SettingsSection[] {
    return SETTINGS_SECTIONS.filter((section) => section.group === group);
  }

  /** Na Conta, mostra o e-mail de quem está logado — ajuda a saber em qual conta se está. */
  descriptionFor(section: SettingsSection): string {
    return section.path === 'conta' ? (this.auth.user()?.email ?? section.description) : section.description;
  }
}

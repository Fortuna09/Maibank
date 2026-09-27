import { Component } from '@angular/core';
import { ReleaseNotes } from '../../../../Components/release-notes/release-notes';
import { APP_VERSION, CHANGELOG } from '../../../../Utils/changelog';

@Component({
  selector: 'app-changelog-page',
  imports: [ReleaseNotes],
  template: `
    <section class="section">
      <div class="section-head">
        <h2>Novidades</h2>
        <span class="tag">Versão {{ version }}</span>
      </div>
      <p class="intro">
        Tudo o que mudou no Maibank, da versão mais nova para a mais antiga. Quando sair uma versão nova, o app avisa
        na próxima vez que você entrar.
      </p>

      <div class="releases">
        @for (release of releases; track release.version) {
          <app-release-notes [release]="release" />
        }
      </div>
    </section>
  `,
  styles: `
    .intro {
      max-width: 720px;
      margin: 0 0 var(--space-4);
      color: var(--text-muted);
      font-size: 0.84rem;
      line-height: 1.5;
    }

    .releases {
      display: grid;
      max-width: 720px;
      border-top: 1px solid var(--border);
    }

    app-release-notes {
      padding: var(--space-4) 0;
      border-bottom: 1px solid var(--border);
    }
  `,
})
export class ChangelogPage {
  readonly version = APP_VERSION;
  readonly releases = CHANGELOG;
}

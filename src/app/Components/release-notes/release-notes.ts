import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { CHANGE_LABEL, ChangeKind, Release } from '../../Utils/changelog';

const TAG_CLASS: Record<ChangeKind, string> = {
  novo: 'income-tag',
  melhoria: 'credit-tag',
  correcao: 'warning-tag',
};

/** Uma versão do changelog: número, data, título e a lista do que mudou. */
@Component({
  selector: 'app-release-notes',
  imports: [DatePipe],
  template: `
    <header class="release-head">
      <span class="release-version">v{{ release().version }}</span>
      <h3>{{ release().title }}</h3>
      <time [attr.datetime]="release().date">{{ release().date | date: 'd MMM y' }}</time>
    </header>

    <ul class="release-changes">
      @for (change of release().changes; track $index) {
        <li>
          <span class="tag" [class]="tagClass[change.kind]">{{ label[change.kind] }}</span>
          <p>{{ change.text }}</p>
        </li>
      }
    </ul>
  `,
  styleUrl: './release-notes.scss',
})
export class ReleaseNotes {
  readonly release = input.required<Release>();

  readonly label = CHANGE_LABEL;
  readonly tagClass = TAG_CLASS;
}

import { Component, computed, input } from '@angular/core';
import { passwordChecks, PASSWORD_MIN_LENGTH } from '../../Utils/password-rule';
import { Icon } from '../icon/icon';

/** Requisitos da senha que vão se marcando enquanto a pessoa digita. */
@Component({
  selector: 'app-password-rules',
  imports: [Icon],
  template: `
    <ul class="password-rules" aria-label="Requisitos da senha">
      <li [class.ok]="checks().length">
        <app-icon [name]="checks().length ? 'check' : 'minus'" [size]="12" />
        {{ minLength }}+ caracteres
      </li>
      <li [class.ok]="checks().letter">
        <app-icon [name]="checks().letter ? 'check' : 'minus'" [size]="12" />
        letras
      </li>
      <li [class.ok]="checks().number">
        <app-icon [name]="checks().number ? 'check' : 'minus'" [size]="12" />
        números
      </li>
    </ul>
  `,
  styles: `
    .password-rules {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 14px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--text-muted);
      font-size: 0.72rem;
      transition: color 0.14s ease;
    }

    li.ok {
      color: var(--success);
    }
  `,
})
export class PasswordRules {
  readonly password = input('');
  readonly checks = computed(() => passwordChecks(this.password()));
  readonly minLength = PASSWORD_MIN_LENGTH;
}

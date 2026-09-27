import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../../../Components/icon/icon';
import { PasswordRules } from '../../../../Components/password-rules/password-rules';
import { apiErrorCode, apiErrorMessage, AuthService } from '../../../../Services/auth.service';
import { FeedbackService } from '../../../../Services/feedback.service';
import { passwordProblem } from '../../../../Utils/password-rule';

/** Aberta pelo link do e-mail de "esqueci minha senha". Ao salvar, já entra na conta. */
@Component({
  selector: 'app-reset-password-page',
  imports: [FormsModule, RouterLink, Icon, PasswordRules],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);

  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  password = '';
  confirmation = '';

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(this.token ? null : 'Este link está incompleto. Abra de novo pelo e-mail ou peça um novo.');
  readonly tokenInvalid = signal(!this.token);

  async submit(): Promise<void> {
    if (!this.token) {
      return;
    }

    this.error.set(null);
    const problem = passwordProblem(this.password);
    if (problem) {
      this.error.set(problem);
      return;
    }
    if (this.password !== this.confirmation) {
      this.error.set('As duas senhas não são iguais.');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.resetPassword(this.token, this.password);
      this.feedback.success('Senha alterada. Você já está dentro.');
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.tokenInvalid.set(apiErrorCode(error) === 'TOKEN_INVALID');
      this.error.set(apiErrorMessage(error, 'Não foi possível trocar a senha. Tente de novo.'));
    } finally {
      this.loading.set(false);
    }
  }
}

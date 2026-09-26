import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../../../Components/icon/icon';
import { apiErrorCode, apiErrorMessage, AuthService, safeReturnUrl } from '../../../../Services/auth.service';
import { FeedbackService } from '../../../../Services/feedback.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink, Icon],
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly feedback = inject(FeedbackService);

  email = '';
  password = '';

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly needsVerification = signal(false);
  readonly resending = signal(false);
  readonly resent = signal(false);

  async submit(): Promise<void> {
    this.error.set(null);
    this.needsVerification.set(false);

    if (!this.email.trim() || !this.password) {
      this.error.set('Preencha e-mail e senha.');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.login(this.email.trim(), this.password);
      await this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('volta')));
    } catch (error) {
      this.needsVerification.set(apiErrorCode(error) === 'EMAIL_NOT_VERIFIED');
      this.error.set(apiErrorMessage(error, 'Não foi possível entrar. Tente de novo.'));
    } finally {
      this.loading.set(false);
    }
  }

  async resendVerification(): Promise<void> {
    this.resending.set(true);
    try {
      await this.auth.resendVerification(this.email.trim());
      this.resent.set(true);
      this.feedback.success('Enviamos um novo link de confirmação');
    } catch (error) {
      this.feedback.error(apiErrorMessage(error, 'Não foi possível reenviar agora.'));
    } finally {
      this.resending.set(false);
    }
  }
}

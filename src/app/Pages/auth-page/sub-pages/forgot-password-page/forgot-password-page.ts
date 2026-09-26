import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Icon } from '../../../../Components/icon/icon';
import { apiErrorMessage, AuthService } from '../../../../Services/auth.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-forgot-password-page',
  imports: [FormsModule, RouterLink, Icon],
  templateUrl: './forgot-password-page.html',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);

  // Vem preenchido quando a pessoa clica em "Esqueci minha senha" já tendo digitado o e-mail.
  email = inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '';

  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    if (!EMAIL_PATTERN.test(this.email.trim())) {
      this.error.set('Informe um e-mail válido.');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.forgotPassword(this.email.trim());
      this.sent.set(true);
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'Não foi possível enviar agora. Tente de novo.'));
    } finally {
      this.loading.set(false);
    }
  }
}

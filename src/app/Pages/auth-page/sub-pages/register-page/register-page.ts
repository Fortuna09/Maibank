import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../Components/icon/icon';
import { apiErrorMessage, AuthService } from '../../../../Services/auth.service';
import { FeedbackService } from '../../../../Services/feedback.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'app-register-page',
  imports: [FormsModule, RouterLink, Icon],
  templateUrl: './register-page.html',
})
export class RegisterPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly feedback = inject(FeedbackService);

  name = '';
  email = '';
  password = '';

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** E-mail para onde o link foi enviado; preenchido, a tela vira "confira seu e-mail". */
  readonly sentTo = signal<string | null>(null);
  readonly emailSent = signal(true);
  readonly resending = signal(false);
  readonly cooldown = signal(0);

  private cooldownTimer?: number;

  async submit(): Promise<void> {
    this.error.set(null);
    const validation = this.validate();
    if (validation) {
      this.error.set(validation);
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.auth.register({ name: this.name.trim(), email: this.email.trim(), password: this.password });
      this.sentTo.set(result.email);
      this.emailSent.set(result.emailSent);
      this.startCooldown();
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'Não foi possível criar a conta. Tente de novo.'));
    } finally {
      this.loading.set(false);
    }
  }

  async resend(): Promise<void> {
    const email = this.sentTo();
    if (!email || this.cooldown() > 0) {
      return;
    }

    this.resending.set(true);
    try {
      await this.auth.resendVerification(email);
      this.emailSent.set(true);
      this.feedback.success('Enviamos um novo link');
      this.startCooldown();
    } catch (error) {
      this.feedback.error(apiErrorMessage(error, 'Não foi possível reenviar agora.'));
    } finally {
      this.resending.set(false);
    }
  }

  ngOnDestroy(): void {
    window.clearInterval(this.cooldownTimer);
  }

  private validate(): string | null {
    if (!this.name.trim()) {
      return 'Diga como você se chama.';
    }
    if (!EMAIL_PATTERN.test(this.email.trim())) {
      return 'Informe um e-mail válido.';
    }
    if (this.password.length < 8) {
      return 'A senha precisa ter pelo menos 8 caracteres.';
    }
    return null;
  }

  private startCooldown(): void {
    window.clearInterval(this.cooldownTimer);
    this.cooldown.set(RESEND_COOLDOWN_SECONDS);
    this.cooldownTimer = window.setInterval(() => {
      this.cooldown.update((value) => Math.max(0, value - 1));
      if (this.cooldown() === 0) {
        window.clearInterval(this.cooldownTimer);
      }
    }, 1000);
  }
}

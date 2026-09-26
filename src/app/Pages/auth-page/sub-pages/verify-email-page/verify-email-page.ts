import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../../../Components/icon/icon';
import { apiErrorMessage, AuthService } from '../../../../Services/auth.service';
import { FeedbackService } from '../../../../Services/feedback.service';

/** Aberta pelo link do e-mail: confirma, já entra na conta e leva para o início. */
@Component({
  selector: 'app-verify-email-page',
  imports: [FormsModule, RouterLink, Icon],
  templateUrl: './verify-email-page.html',
})
export class VerifyEmailPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly feedback = inject(FeedbackService);

  readonly state = signal<'verifying' | 'error'>('verifying');
  readonly error = signal('');

  email = '';
  readonly resending = signal(false);
  readonly resent = signal(false);

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.fail('Este link está incompleto. Abra de novo pelo e-mail ou peça um novo.');
      return;
    }

    try {
      await this.auth.verifyEmail(token);
      this.feedback.success('E-mail confirmado. Bem-vindo ao Maibank!');
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.fail(apiErrorMessage(error, 'Não foi possível confirmar o e-mail.'));
    }
  }

  async resend(): Promise<void> {
    if (!this.email.trim()) {
      return;
    }

    this.resending.set(true);
    try {
      await this.auth.resendVerification(this.email.trim());
      this.resent.set(true);
    } catch (error) {
      this.feedback.error(apiErrorMessage(error, 'Não foi possível reenviar agora.'));
    } finally {
      this.resending.set(false);
    }
  }

  private fail(message: string): void {
    this.error.set(message);
    this.state.set('error');
  }
}

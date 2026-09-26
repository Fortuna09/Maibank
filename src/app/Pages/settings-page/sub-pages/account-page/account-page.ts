import { Component, inject, signal } from '@angular/core';
import { Icon } from '../../../../Components/icon/icon';
import { apiErrorMessage, AuthService } from '../../../../Services/auth.service';
import { FeedbackService } from '../../../../Services/feedback.service';

@Component({
  selector: 'app-account-page',
  imports: [Icon],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  readonly auth = inject(AuthService);
  private readonly feedback = inject(FeedbackService);

  readonly leaving = signal<'this' | 'all' | null>(null);
  readonly confirmingAll = signal(false);

  async logout(): Promise<void> {
    this.leaving.set('this');
    try {
      await this.auth.logout();
    } finally {
      this.leaving.set(null);
    }
  }

  async logoutEverywhere(): Promise<void> {
    this.leaving.set('all');
    try {
      await this.feedback.run(() => this.auth.logoutEverywhere(), { success: 'Você saiu de todos os dispositivos' });
    } catch (error) {
      this.feedback.error(apiErrorMessage(error, 'Não foi possível encerrar as sessões agora.'));
    } finally {
      this.leaving.set(null);
      this.confirmingAll.set(false);
    }
  }
}

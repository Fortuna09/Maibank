import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../../Components/icon/icon';
import { MessageDialog } from '../../../../Components/message-dialog/message-dialog';
import { apiErrorMessage } from '../../../../Services/auth.service';
import { FeedbackService } from '../../../../Services/feedback.service';
import { AdminUser, MessagesService, SentBatch } from '../../../../Services/messages.service';

const TITLE_MAX = 80;
const BODY_MAX = 1000;

/**
 * Administração (só para ADMIN_EMAILS): mandar uma mensagem para pessoas escolhidas ou para
 * todo mundo, sem mexer em código. Quem recebe vê um pop-up na próxima vez que abrir o app.
 */
@Component({
  selector: 'app-admin-page',
  imports: [DatePipe, FormsModule, Icon, MessageDialog],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage implements OnInit, OnDestroy {
  private readonly messages = inject(MessagesService);
  private readonly feedback = inject(FeedbackService);

  readonly titleMax = TITLE_MAX;
  readonly bodyMax = BODY_MAX;

  readonly audience = signal<'people' | 'all'>('people');
  readonly selected = signal<AdminUser[]>([]);
  readonly results = signal<AdminUser[]>([]);
  readonly searching = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly history = signal<SentBatch[]>([]);
  readonly historyLoaded = signal(false);
  readonly previewDraft = signal<{ title: string; body: string; createdAt: string } | null>(null);
  readonly closePreview = () => this.previewDraft.set(null);

  query = '';
  title = '';
  body = '';

  private searchTimer?: number;
  private searchRun = 0;

  ngOnInit(): void {
    void this.search();
    void this.loadHistory();
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.searchTimer);
  }

  /** Busca enquanto digita, esperando uma pausa curta para não disparar a cada letra. */
  onQueryChange(): void {
    window.clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => void this.search(), 250);
  }

  isSelected(user: AdminUser): boolean {
    return this.selected().some((item) => item.id === user.id);
  }

  toggle(user: AdminUser): void {
    this.selected.update((list) => (this.isSelected(user) ? list.filter((item) => item.id !== user.id) : [...list, user]));
    this.error.set(null);
  }

  remove(user: AdminUser): void {
    this.selected.update((list) => list.filter((item) => item.id !== user.id));
  }

  showPreview(): void {
    const problem = this.validate(false);
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.previewDraft.set({ title: this.title.trim(), body: this.body.trim(), createdAt: new Date().toISOString() });
  }

  async send(): Promise<void> {
    const problem = this.validate(true);
    if (problem) {
      this.error.set(problem);
      return;
    }

    const toAll = this.audience() === 'all';
    const count = this.selected().length;
    this.error.set(null);
    this.sending.set(true);
    try {
      await this.feedback.run(
        () => this.messages.send(toAll ? 'all' : this.selected().map((user) => user.id), this.title.trim(), this.body.trim()),
        {
          success: toAll ? 'Mensagem enviada para todos' : `Mensagem enviada para ${count} ${count === 1 ? 'pessoa' : 'pessoas'}`,
          error: 'Não foi possível enviar. Tente de novo.',
        },
      );
      this.title = '';
      this.body = '';
      this.selected.set([]);
      await this.loadHistory();
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'Não foi possível enviar. Tente de novo.'));
    } finally {
      this.sending.set(false);
    }
  }

  audienceLabel(batch: SentBatch): string {
    if (batch.toAll) {
      return `todos · ${batch.recipients} ${batch.recipients === 1 ? 'pessoa' : 'pessoas'}`;
    }
    if (batch.recipients === 1) {
      return batch.people[0]?.name ?? '1 pessoa';
    }
    return `${batch.people[0]?.name} e mais ${batch.recipients - 1}`;
  }

  private validate(needsAudience: boolean): string | null {
    if (!this.title.trim()) {
      return 'Dê um título para a mensagem.';
    }
    if (!this.body.trim()) {
      return 'Escreva a mensagem.';
    }
    if (needsAudience && this.audience() === 'people' && !this.selected().length) {
      return 'Escolha pelo menos uma pessoa — ou envie para todos.';
    }
    return null;
  }

  private async search(): Promise<void> {
    const run = ++this.searchRun;
    this.searching.set(true);
    try {
      const users = await this.messages.searchUsers(this.query.trim());
      if (run === this.searchRun) {
        this.results.set(users);
      }
    } catch {
      if (run === this.searchRun) {
        this.results.set([]);
      }
    } finally {
      if (run === this.searchRun) {
        this.searching.set(false);
      }
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      this.history.set(await this.messages.history());
    } catch {
      this.history.set([]);
    } finally {
      this.historyLoaded.set(true);
    }
  }
}

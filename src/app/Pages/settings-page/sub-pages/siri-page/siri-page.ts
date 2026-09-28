import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../../Components/icon/icon';
import { apiErrorMessage } from '../../../../Services/auth.service';
import { FeedbackService } from '../../../../Services/feedback.service';
import { ShortcutExpensePreview, ShortcutKeyInfo, ShortcutLogEntry, SiriShortcutService } from '../../../../Services/siri-shortcut.service';

/**
 * Siri e atalhos: a pessoa gera uma chave pessoal, monta o atalho "Mai" no app Atalhos do
 * iPhone e passa a lançar gastos falando, sem abrir o Maibank.
 */
@Component({
  selector: 'app-siri-page',
  imports: [CurrencyPipe, DatePipe, FormsModule, Icon],
  templateUrl: './siri-page.html',
  styleUrl: './siri-page.scss',
})
export class SiriPage implements OnInit {
  private readonly shortcuts = inject(SiriShortcutService);
  private readonly feedback = inject(FeedbackService);

  readonly endpoint = this.shortcuts.endpoint;
  readonly info = signal<ShortcutKeyInfo | null>(null);
  /** Chave recém-criada: só existe na tela até sair dela. */
  readonly newKey = signal<string | null>(null);
  readonly busy = signal(false);
  readonly confirmRevoke = signal(false);

  /** Últimos pedidos pela Siri: mostra o que ela escreveu, para achar erro de transcrição. */
  readonly history = signal<ShortcutLogEntry[] | null>(null);
  readonly loadingHistory = signal(false);

  phrase = '6 e 67 de bala';
  readonly testing = signal(false);
  readonly preview = signal<ShortcutExpensePreview | null>(null);
  readonly previewError = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadInfo();
    void this.loadHistory();
  }

  async loadHistory(): Promise<void> {
    this.loadingHistory.set(true);
    try {
      this.history.set(await this.shortcuts.history());
    } catch {
      this.history.set([]);
    } finally {
      this.loadingHistory.set(false);
    }
  }

  async generate(): Promise<void> {
    this.busy.set(true);
    try {
      const created = await this.feedback.run(() => this.shortcuts.createKey(), {
        success: 'Chave criada',
        error: 'Não foi possível criar a chave. Tente de novo.',
      });
      this.newKey.set(created.key);
      this.confirmRevoke.set(false);
      await this.loadInfo();
    } catch {
      // o toast de erro já avisou
    } finally {
      this.busy.set(false);
    }
  }

  async revoke(): Promise<void> {
    this.busy.set(true);
    try {
      await this.feedback.run(() => this.shortcuts.revokeKey(), {
        success: 'Atalho desativado',
        error: 'Não foi possível desativar. Tente de novo.',
      });
      this.newKey.set(null);
      this.confirmRevoke.set(false);
      await this.loadInfo();
    } catch {
      // o toast de erro já avisou
    } finally {
      this.busy.set(false);
    }
  }

  async copy(text: string, what: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.feedback.success(`${what} copiad${what.endsWith('a') ? 'a' : 'o'}`);
    } catch {
      this.feedback.error('Não deu para copiar. Selecione o texto e copie à mão.');
    }
  }

  async test(): Promise<void> {
    if (!this.phrase.trim()) {
      return;
    }
    this.testing.set(true);
    this.previewError.set(null);
    try {
      this.preview.set(await this.shortcuts.preview(this.phrase));
    } catch (error) {
      this.preview.set(null);
      this.previewError.set(apiErrorMessage(error, 'Não foi possível testar agora.'));
    } finally {
      this.testing.set(false);
    }
  }

  private async loadInfo(): Promise<void> {
    try {
      this.info.set(await this.shortcuts.keyInfo());
    } catch {
      this.info.set({ active: false });
    }
  }
}

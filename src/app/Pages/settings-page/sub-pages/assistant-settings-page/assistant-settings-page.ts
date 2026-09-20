import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../../Components/icon/icon';
import { AssistantService, DEFAULT_ASSISTANT_MODEL } from '../../../../Services/assistant.service';
import { FeedbackService } from '../../../../Services/feedback.service';
import { ASSISTANT_NAME } from '../../../../Utils/assistant-prompt';

@Component({
  selector: 'app-assistant-settings-page',
  imports: [FormsModule, Icon],
  templateUrl: './assistant-settings-page.html',
  styleUrl: './assistant-settings-page.scss',
})
export class AssistantSettingsPage {
  readonly assistant = inject(AssistantService);
  private readonly feedback = inject(FeedbackService);

  readonly name = ASSISTANT_NAME;
  readonly defaultModel = DEFAULT_ASSISTANT_MODEL;

  readonly keyDraft = signal(this.assistant.apiKey());
  readonly modelDraft = signal(this.assistant.model() || DEFAULT_ASSISTANT_MODEL);
  readonly showKey = signal(false);
  readonly saving = signal(false);

  save(): void {
    this.saving.set(true);
    void this.feedback
      .run(
        async () => {
          this.assistant.apiKey.set(this.keyDraft().trim());
          this.assistant.model.set(this.modelDraft().trim() || DEFAULT_ASSISTANT_MODEL);
        },
        { success: this.keyDraft().trim() ? 'Assistente configurada' : 'Chave removida' }
      )
      .finally(() => this.saving.set(false));
  }

  clearConversation(): void {
    this.assistant.clear();
    this.feedback.info('Conversa apagada');
  }
}

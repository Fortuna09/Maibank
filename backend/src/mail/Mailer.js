import { config } from '../config.js';

/**
 * Envia e-mails pelo Resend (API HTTP, sem SDK). Sem RESEND_API_KEY o e-mail não
 * sai: o conteúdo vai para o console — é assim que o fluxo é testado localmente.
 */
export class Mailer {
  constructor(options = config.mail) {
    this.apiKey = options.resendApiKey;
    this.from = options.from;
  }

  async send({ to, subject, html, text }) {
    if (!this.apiKey) {
      console.log(`\n[mail] (sem RESEND_API_KEY — e-mail não enviado)\nPara: ${to}\nAssunto: ${subject}\n${text}\n`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [to], subject, html, text }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend recusou o e-mail (${response.status}): ${detail}`);
    }
  }
}

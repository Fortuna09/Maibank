import nodemailer from 'nodemailer';
import { config } from '../config.js';

/**
 * Envia os e-mails do app pelo provedor configurado (ver `resolveMail` em config.js):
 * Gmail via SMTP, Resend via API HTTP, ou — sem nada configurado — só imprime no console,
 * que é como o fluxo é testado localmente.
 */
export class Mailer {
  constructor(options = config.mail) {
    this.options = options;
    this.transport = null;
  }

  async send({ to, subject, html, text }) {
    switch (this.options.provider) {
      case 'smtp':
        return this.sendSmtp({ to, subject, html, text });
      case 'resend':
        return this.sendResend({ to, subject, html, text });
      default:
        console.log(`\n[mail] (nenhum provedor de e-mail configurado — não enviado)\nPara: ${to}\nAssunto: ${subject}\n${text}\n`);
    }
  }

  async sendSmtp({ to, subject, html, text }) {
    const { host, port, user, pass } = this.options.smtp;
    // Reaproveitado entre envios da mesma instância; conexão aberta só na hora de enviar.
    this.transport ??= nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    try {
      await this.transport.sendMail({ from: this.options.from, to, subject, html, text });
    } catch (error) {
      throw new Error(`SMTP recusou o e-mail (${error.responseCode ?? error.code ?? 'sem código'}): ${error.message}`);
    }
  }

  async sendResend({ to, subject, html, text }) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.options.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.options.from, to: [to], subject, html, text }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend recusou o e-mail (${response.status}): ${detail}`);
    }
  }
}

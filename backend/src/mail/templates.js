/**
 * E-mails transacionais. HTML simples com estilos inline (clientes de e-mail
 * ignoram <style>), sempre acompanhado da versão em texto puro.
 */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function layout({ title, intro, buttonLabel, url, footnote }) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px 12px;background:#f2f3f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#060607;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e3e5e8;border-radius:3px;">
          <tr><td style="padding:20px 24px;border-bottom:1px solid #e3e5e8;font-size:16px;font-weight:700;">Maibank</td></tr>
          <tr><td style="padding:24px;">
            <h1 style="margin:0 0 12px;font-size:18px;">${escapeHtml(title)}</h1>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#313338;">${intro}</p>
            <a href="${url}" style="display:inline-block;padding:10px 18px;background:#060607;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:3px;">${escapeHtml(buttonLabel)}</a>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#5c5e66;">Se o botão não funcionar, copie este endereço no navegador:<br><span style="word-break:break-all;">${escapeHtml(url)}</span></p>
            <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#5c5e66;">${escapeHtml(footnote)}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function verifyEmailMessage({ name, url }) {
  const firstName = String(name).trim().split(/\s+/)[0];
  return {
    subject: 'Confirme seu e-mail no Maibank',
    html: layout({
      title: `Oi, ${firstName}!`,
      intro: 'Falta só confirmar que este e-mail é seu para começar a usar o Maibank.',
      buttonLabel: 'Confirmar e-mail',
      url,
      footnote: 'O link vale por 24 horas. Se você não criou uma conta, pode ignorar esta mensagem.',
    }),
    text: `Oi, ${firstName}!\n\nConfirme seu e-mail para começar a usar o Maibank:\n${url}\n\nO link vale por 24 horas. Se você não criou uma conta, ignore esta mensagem.`,
  };
}

export function resetPasswordMessage({ name, url }) {
  const firstName = String(name).trim().split(/\s+/)[0];
  return {
    subject: 'Redefinir sua senha do Maibank',
    html: layout({
      title: 'Redefinir senha',
      intro: `${escapeHtml(firstName)}, recebemos um pedido para trocar a senha da sua conta.`,
      buttonLabel: 'Criar nova senha',
      url,
      footnote: 'O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore — sua senha continua a mesma.',
    }),
    text: `${firstName}, recebemos um pedido para trocar a senha da sua conta no Maibank.\n\nCrie uma nova senha:\n${url}\n\nO link vale por 1 hora. Se não foi você, ignore esta mensagem.`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// E-mail transacional via Resend (doc 08).
// No-op gracioso em dev (sem RESEND_API_KEY): loga o que enviaria e segue —
// nunca derruba a request (exceto onde o e-mail é o produto, tratado no caller).
// ─────────────────────────────────────────────────────────────────────
require('dotenv').config();

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'Pulso Urbano <nao-responda@pulsourbano.org>';
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

const layout = (titulo, corpoHtml) => `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a242f">
  <h2 style="color:#2f54eb">Pulso Urbano</h2>
  <h3>${esc(titulo)}</h3>
  ${corpoHtml}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
  <p style="font-size:12px;color:#64748b">
    Observatório de Segurança Pública · CRISP/UFMG.
    Se você não solicitou este e-mail, ignore-o — nenhuma ação será tomada.
  </p>
</div>`;

// Templates: cada um devolve { subject, html }. Links absolutos via APP_URL.
// E-mails de AVISO nunca contêm link de login (anti-phishing) — só instruem.
const TEMPLATES = {
  verificar_email: ({ nome, token }) => ({
    subject: 'Confirme seu e-mail — Pulso Urbano',
    html: layout('Confirme seu e-mail', `
      <p>Olá${nome ? ', ' + esc(nome) : ''}. Confirme seu endereço para ativar a conta:</p>
      <p><a href="${APP_URL}/verificar-email?token=${token}"
         style="background:#2f54eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Confirmar e-mail</a></p>
      <p style="font-size:12px;color:#64748b">O link expira em 24 horas.</p>`),
  }),
  reset_senha: ({ token, tipo }) => ({
    subject: 'Redefinição de senha — Pulso Urbano',
    html: layout('Redefinir senha', `
      <p>Recebemos um pedido para redefinir sua senha.</p>
      <p><a href="${APP_URL}/redefinir-senha?token=${token}${tipo === 'admin' ? '&tipo=admin' : ''}"
         style="background:#2f54eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Redefinir senha</a></p>
      <p style="font-size:12px;color:#64748b">O link expira em 1 hora. Se não foi você, ignore.</p>`),
  }),
  confirmar_novo_email: ({ token }) => ({
    subject: 'Confirme seu novo e-mail — Pulso Urbano',
    html: layout('Confirme o novo e-mail', `
      <p>Confirme este endereço para concluir a troca de e-mail da sua conta:</p>
      <p><a href="${APP_URL}/confirmar-email?token=${token}"
         style="background:#2f54eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Confirmar</a></p>`),
  }),
  aviso_troca_email: ({ novoEmail }) => ({
    subject: 'Solicitação de troca de e-mail — Pulso Urbano',
    html: layout('Troca de e-mail solicitada', `
      <p>Foi solicitada a troca do e-mail da sua conta para <strong>${esc(novoEmail)}</strong>.</p>
      <p>Se <strong>não</strong> foi você, acesse o site e altere sua senha imediatamente,
         e contate o suporte.</p>`),
  }),
  aviso_troca_senha: () => ({
    subject: 'Sua senha foi alterada — Pulso Urbano',
    html: layout('Senha alterada', `
      <p>A senha da sua conta foi alterada. Todas as outras sessões foram encerradas.</p>
      <p>Se não foi você, acesse o site e redefina sua senha agora mesmo.</p>`),
  }),
  convite_admin: ({ token }) => ({
    subject: 'Convite de administrador — Pulso Urbano',
    html: layout('Você foi convidado como administrador', `
      <p>Defina sua senha para ativar o acesso administrativo:</p>
      <p><a href="${APP_URL}/definir-senha?token=${token}"
         style="background:#2f54eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Definir senha</a></p>`),
  }),
};

async function sendEmail({ to, template, dados = {} }) {
  const build = TEMPLATES[template];
  if (!build) throw new Error(`template desconhecido: ${template}`);
  const { subject, html } = build(dados);

  if (!API_KEY) {
    console.log(JSON.stringify({ evt: 'email_noop', template, to, subject, motivo: 'RESEND_API_KEY ausente (dev)' }));
    return { ok: true, noop: true };
  }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error(JSON.stringify({ evt: 'email_falha', template, to, status: resp.status, txt: txt.slice(0, 200) }));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error(JSON.stringify({ evt: 'email_falha', template, to, motivo: e.message }));
    return { ok: false };
  }
}

module.exports = { sendEmail, APP_URL };

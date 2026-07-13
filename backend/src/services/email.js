// ─────────────────────────────────────────────────────────────────────
// E-mail transacional via EmailJS (API REST server-side).
//
// EmailJS foi desenhado pro browser, mas expõe um endpoint REST que aceita a
// PRIVATE KEY (accessToken) para chamadas de servidor. Requer habilitar em
// Account → Security → "Allow EmailJS API for non-browser applications".
//
// Cada finalidade mapeia para UM template do EmailJS (id vindo de env var) e
// monta os `template_params`. O template no painel deve usar essas variáveis:
//   {{to_email}}  → destinatário (campo "To Email" nas Settings do template)
//   {{subject}}   → assunto
//   {{title}}     → título curto
//   {{message}}   → corpo do texto
//   {{link}}      → URL de ação (botão) — alias: {{action_url}}
//   {{action_label}} → rótulo do botão
//   {{nome}}      → nome do destinatário (quando houver)
//
// No-op gracioso (loga e segue) quando faltam credenciais ou o template daquela
// finalidade ainda não foi configurado — assim o fluxo nunca derruba a request.
// ─────────────────────────────────────────────────────────────────────
require('dotenv').config();

const EMAILJS_URL  = 'https://api.emailjs.com/api/v1.0/email/send';
const SERVICE_ID   = process.env.EMAILJS_SERVICE_ID;
const PUBLIC_KEY   = process.env.EMAILJS_PUBLIC_KEY;
const PRIVATE_KEY  = process.env.EMAILJS_PRIVATE_KEY;
const APP_URL      = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

// Monta o link de ação (frontend). tipo=admin vai no query p/ a tela de reset
// saber pra qual login voltar.
const resetLink = (token, tipo) =>
  `${APP_URL}/redefinir-senha?token=${token}${tipo === 'admin' ? '&tipo=admin' : ''}`;

// Cada finalidade → { templateId (env var), params(dados) => {...} }.
// Só quem tiver EMAILJS_TEMPLATE_* definido no ambiente envia de verdade.
const TEMPLATES = {
  reset_senha: {
    templateId: () => process.env.EMAILJS_TEMPLATE_RESET,
    params: ({ token, tipo }) => {
      const link = resetLink(token, tipo);
      return {
        subject: 'Redefinição de senha — Pulso Urbano',
        title: 'Redefinir senha',
        message: 'Recebemos um pedido para redefinir a senha da sua conta. Use o link abaixo para escolher uma nova senha. O link expira em 1 hora. Se não foi você, ignore este e-mail.',
        link, action_url: link, action_label: 'Redefinir senha',
      };
    },
  },

  verificar_email: {
    templateId: () => process.env.EMAILJS_TEMPLATE_VERIFICAR,
    params: ({ nome, token }) => {
      const link = `${APP_URL}/verificar-email?token=${token}`;
      return {
        subject: 'Confirme seu e-mail — Pulso Urbano',
        title: 'Confirme seu e-mail',
        nome: nome || '',
        message: 'Confirme seu endereço de e-mail para ativar sua conta. O link expira em 24 horas.',
        link, action_url: link, action_label: 'Confirmar e-mail',
      };
    },
  },

  confirmar_novo_email: {
    templateId: () => process.env.EMAILJS_TEMPLATE_CONFIRMAR_EMAIL,
    params: ({ token }) => {
      const link = `${APP_URL}/confirmar-email?token=${token}`;
      return {
        subject: 'Confirme seu novo e-mail — Pulso Urbano',
        title: 'Confirme o novo e-mail',
        message: 'Confirme este endereço para concluir a troca de e-mail da sua conta.',
        link, action_url: link, action_label: 'Confirmar',
      };
    },
  },

  aviso_troca_email: {
    templateId: () => process.env.EMAILJS_TEMPLATE_AVISO_EMAIL,
    params: ({ novoEmail }) => ({
      subject: 'Solicitação de troca de e-mail — Pulso Urbano',
      title: 'Troca de e-mail solicitada',
      message: `Foi solicitada a troca do e-mail da sua conta para ${novoEmail}. Se não foi você, altere sua senha imediatamente e contate o suporte.`,
    }),
  },

  aviso_troca_senha: {
    templateId: () => process.env.EMAILJS_TEMPLATE_AVISO_SENHA,
    params: () => ({
      subject: 'Sua senha foi alterada — Pulso Urbano',
      title: 'Senha alterada',
      message: 'A senha da sua conta foi alterada e as outras sessões foram encerradas. Se não foi você, redefina sua senha agora mesmo.',
    }),
  },

  convite_admin: {
    templateId: () => process.env.EMAILJS_TEMPLATE_CONVITE,
    params: ({ token }) => {
      const link = `${APP_URL}/definir-senha?token=${token}`;
      return {
        subject: 'Convite de administrador — Pulso Urbano',
        title: 'Você foi convidado como administrador',
        message: 'Defina sua senha para ativar o acesso administrativo.',
        link, action_url: link, action_label: 'Definir senha',
      };
    },
  },
};

async function sendEmail({ to, template, dados = {} }) {
  const def = TEMPLATES[template];
  if (!def) throw new Error(`template desconhecido: ${template}`);

  const templateId = def.templateId?.();
  const params = def.params ? def.params(dados) : {};

  // Sem credenciais OU sem template configurado p/ esta finalidade → no-op.
  if (!SERVICE_ID || !PUBLIC_KEY || !PRIVATE_KEY || !templateId) {
    const motivo = !templateId ? 'template EmailJS não configurado p/ esta finalidade'
      : 'credenciais EmailJS ausentes (dev)';
    console.log(JSON.stringify({ evt: 'email_noop', template, to, motivo }));
    return { ok: true, noop: true };
  }

  try {
    const resp = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: templateId,
        user_id: PUBLIC_KEY,
        accessToken: PRIVATE_KEY,
        // to_email/email = mesmo valor (aliases). EmailJS não tem convenção
        // fixa de nome de variável entre templates — os templates padrão do
        // próprio EmailJS usam {{email}}; os nossos usam {{to_email}}.
        template_params: { to_email: to, email: to, ...params },
      }),
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

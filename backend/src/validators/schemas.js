// Schemas Zod compartilhados (login e query params de listagem).
const { z } = require('zod');

// ── Login admin ──────────────────────────────────────────────────────
// Mensagens em PT mantêm o tom das respostas atuais da API.
// preprocess (null/undefined → '') garante a mensagem amigável em vez do erro
// genérico do Zod v4 ("expected string, received undefined").
const loginSchema = z.object({
  email: z.preprocess(
    (v) => (v == null ? '' : String(v)),
    z.string().trim().min(1, 'Email e senha são obrigatórios.').email('Email inválido.')
  ),
  password: z.preprocess(
    (v) => (v == null ? '' : String(v)),
    z.string().min(1, 'Email e senha são obrigatórios.')
  ),
  rememberMe: z.boolean().optional(),
});

function validateLogin(body) {
  const r = loginSchema.safeParse(body || {});
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, message: r.error.issues[0].message };
}

// ── Query params de listagem ─────────────────────────────────────────
// Lenient por design: coage e usa defaults em vez de rejeitar (uma query
// malformada não deve quebrar a navegação). `.catch()` garante o fallback.
const ENTRY_TYPES = ['analysis', 'academic', 'dataset', 'podcast'];
const SORTS = ['date_desc', 'date_asc', 'title_asc', 'relevance'];

const listQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
  sort:  z.enum(SORTS).catch('date_desc'),
  entry_type: z.enum(ENTRY_TYPES).optional().catch(undefined),
  // crisp: aceita "true"/"1"/true → boolean; qualquer outra coisa → false.
  crisp: z.preprocess((v) => v === true || v === 'true' || v === '1', z.boolean()).catch(false),
  category: z.string().trim().optional(),
  source:   z.string().trim().optional(),
  tag:      z.string().trim().optional(),
  search:   z.string().trim().optional(),
}).passthrough();

// Sanitiza e devolve os params normalizados (nunca lança).
function parseListQuery(query) {
  return listQuerySchema.parse(query || {});
}

module.exports = { loginSchema, validateLogin, listQuerySchema, parseListQuery, ENTRY_TYPES, SORTS };

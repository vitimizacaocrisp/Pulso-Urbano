// ─────────────────────────────────────────────────────────────────────
// Rate limiting para o login admin, usando Upstash Redis.
//
// Em ambiente serverless (Vercel) a memória do processo não persiste entre
// invocações, então o controle precisa de um store externo. O Upstash é um
// Redis serverless acessado via REST.
//
// Degradação graciosa: se as variáveis de ambiente não estiverem
// configuradas (ex.: dev local), o middleware vira um no-op e apenas loga
// um aviso — o login continua funcionando, só sem rate limiting.
// ─────────────────────────────────────────────────────────────────────
require('dotenv').config();
const { Ratelimit } = require('@upstash/ratelimit');
const { Redis } = require('@upstash/redis');

const url   = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimit = null;

if (url && token) {
  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    // 5 tentativas a cada 15 minutos por IP (janela deslizante)
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'ratelimit:admin-auth',
  });
} else {
  console.warn('⚠️  Rate limiting DESATIVADO: UPSTASH_REDIS_REST_URL/TOKEN não configurados.');
}

// IP confiável: prioriza x-real-ip (setado pela Vercel, não forjável pelo
// cliente); x-forwarded-for primeiro-valor é spoofável (doc 07) e fica como
// último recurso. Requer app.set('trust proxy', 1) para req.ip fazer sentido.
function getClientIp(req) {
  const real = req.headers['x-real-ip'];
  if (real) return String(real).trim();
  if (req.ip) return req.ip;
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}

const loginRateLimiter = async (req, res, next) => {
  if (!ratelimit) return next(); // no-op se não configurado

  try {
    const { success } = await ratelimit.limit(getClientIp(req));
    if (!success) {
      return res.status(429).json({
        success: false,
        message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
      });
    }
    next();
  } catch (err) {
    // Se o Redis falhar, não bloqueia o login (fail-open) — apenas loga.
    console.error('Erro no rate limiter:', err.message);
    next();
  }
};

// Factory genérica (matriz de limites — doc 07). Mesmo comportamento do login:
// no-op sem Upstash, fail-open em erro de Redis (rate limit não é revogação de
// sessão; para sessão o doc 04 exige fail-closed — implementado no middleware v2).
// `chave` opcional: função (req) → string p/ dimensionar o limite (ex.: por
// admin em vez de por IP). Default = IP confiável.
function makeRateLimiter({ prefix, tokens, janela, mensagem, chave }) {
  if (!url || !token) return (req, res, next) => next();
  const rl = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(tokens, janela),
    prefix: `ratelimit:${prefix}`,
  });
  const keyOf = typeof chave === 'function' ? chave : getClientIp;
  return async (req, res, next) => {
    try {
      const { success } = await rl.limit(keyOf(req));
      if (!success) {
        return res.status(429).json({
          success: false,
          error: { code: 'rate_limited', message: mensagem || 'Muitas requisições. Tente mais tarde.' },
        });
      }
      next();
    } catch (err) {
      console.error(`Rate limiter ${prefix}:`, err.message);
      next();
    }
  };
}

module.exports = { loginRateLimiter, makeRateLimiter, getClientIp };

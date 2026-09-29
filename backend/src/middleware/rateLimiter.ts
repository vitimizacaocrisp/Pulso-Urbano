// Distributed rate limiting via Upstash with a safe in-memory fallback.
// The fallback protects each instance (weaker in serverless), but avoids
// leaving login, registration, and uploads completely unbounded when Redis
// is absent or temporarily unavailable.
import 'dotenv/config';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import type { NextFunction, Response } from 'express';
import type { Req } from '../types/http';
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimit = null;

if (url && token) {
  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'ratelimit:admin-auth',
  });
} else {
  console.warn('Upstash ausente: rate limiting usando fallback em memoria por instancia.');
}

function windowMs(janela: any) {
  const match = String(janela || '').trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) throw new Error(`Janela de rate limit invalida: ${janela}`);
  const unit = ({ s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as Record<string, number>)[match[2].toLowerCase()];
  return Number(match[1]) * unit;
}

function memoryLimit({ tokens, janela }: any) {
  const max = Number(tokens);
  const ttl = windowMs(janela);
  const buckets = new Map();

  return (key: any) => {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + ttl };
    bucket.count += 1;
    buckets.set(key, bucket);

    // Limpeza oportunista impede crescimento ilimitado sob ataque com muitos IPs.
    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
      while (buckets.size > 10_000) buckets.delete(buckets.keys().next().value);
    }
    return bucket.count <= max;
  };
}

// Trusted client IP: prefer x-real-ip, which is set by the hosting proxy.
function getClientIp(req: Req) {
  const real = req.headers['x-real-ip'];
  if (real) return String(real).trim();
  if (req.ip) return req.ip;
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return 'unknown';
}

const loginMemoryLimit = memoryLimit({ tokens: 5, janela: '15 m' });
const loginLimited = (res: Response) => res.status(429).json({
  success: false,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
});

const loginRateLimiter = async (req: Req, res: Response, next: NextFunction) => {
  const key = getClientIp(req);
  const fallbackSuccess = loginMemoryLimit(key);
  if (!ratelimit) return fallbackSuccess ? next() : loginLimited(res);

  try {
    const { success } = await ratelimit.limit(key);
    return success ? next() : loginLimited(res);
  } catch (err) {
    console.error('Erro no rate limiter:', err.message);
    return fallbackSuccess ? next() : loginLimited(res);
  }
};

function makeRateLimiter({ prefix, tokens, janela, mensagem, chave }: any) {
  const keyOf = typeof chave === 'function' ? chave : getClientIp;
  const fallback = memoryLimit({ tokens, janela });
  const rl = url && token ? new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(tokens, janela),
    prefix: `ratelimit:${prefix}`,
  }) : null;
  const limited = (res: Response) => res.status(429).json({
    success: false,
    error: { code: 'rate_limited', message: mensagem || 'Muitas requisi\u00e7\u00f5es. Tente mais tarde.' },
  });

  return async (req: Req, res: Response, next: NextFunction) => {
    const key = keyOf(req);
    const fallbackSuccess = fallback(key);
    if (!rl) return fallbackSuccess ? next() : limited(res);

    try {
      const { success } = await rl.limit(key);
      return success ? next() : limited(res);
    } catch (err) {
      console.error(`Rate limiter ${prefix}:`, err.message);
      return fallbackSuccess ? next() : limited(res);
    }
  };
}

export { loginRateLimiter, makeRateLimiter, getClientIp };

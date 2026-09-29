// ─────────────────────────────────────────────────────────────────────
// 2FA TOTP para admins (doc 07). speakeasy (RFC 6238, CommonJS puro — otplib
// foi trocado por causa de um require() de ESM (@scure/base) incompatível
// com o runtime serverless da Vercel, que derrubava o processo inteiro) + QR
// (qrcode). Segredo base32 guardado em admins.totp_secret; códigos de
// recuperação guardados HASHEADOS (sha256) em admins.totp_recovery.
// ─────────────────────────────────────────────────────────────────────
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import qrcode from 'qrcode';

const ISSUER = 'Pulso Urbano';

async function novoSecret() { return speakeasy.generateSecret({ length: 20 }).base32; }

async function uri(secret: any, label: any) {
  return speakeasy.otpauthURL({ secret, label, issuer: ISSUER, encoding: 'base32' });
}

async function qrDataUrl(uriStr: any) { return qrcode.toDataURL(uriStr); }

// Confere um token TOTP (tolera espaços; window:1 = ±30s de tolerância de relógio).
async function conferir(secret: any, token: any) {
  const t = String(token || '').replace(/\s+/g, '');
  if (!secret || !/^\d{6}$/.test(t)) return false;
  try { return speakeasy.totp.verify({ secret, encoding: 'base32', token: t, window: 1 }); }
  catch { return false; }
}

// Gera N códigos de recuperação. Devolve os planos (mostrar 1x) + hashes p/ guardar.
function gerarRecovery(n = 8) {
  const plain = []; const hashed = [];
  for (let i = 0; i < n; i++) {
    const code = crypto.randomBytes(5).toString('hex'); // 10 hex chars, minúsculo
    plain.push(code);
    hashed.push(hashCode(code));
  }
  return { plain, hashed };
}

function hashCode(code: any) {
  return crypto.createHash('sha256').update(String(code || '').trim().toLowerCase()).digest('hex');
}

export { novoSecret, uri, qrDataUrl, conferir, gerarRecovery, hashCode };

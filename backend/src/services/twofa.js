// ─────────────────────────────────────────────────────────────────────
// 2FA TOTP para admins (doc 07). otplib (RFC 6238) + QR (qrcode).
// Segredo base32 guardado em admins.totp_secret; códigos de recuperação
// guardados HASHEADOS (sha256) em admins.totp_recovery.
// ─────────────────────────────────────────────────────────────────────
const otp = require('otplib');
const crypto = require('crypto');
const qrcode = require('qrcode');

const ISSUER = 'Pulso Urbano';

async function novoSecret() { return otp.generateSecret(); }

async function uri(secret, label) { return otp.generateURI({ secret, label, issuer: ISSUER }); }

async function qrDataUrl(uriStr) { return qrcode.toDataURL(uriStr); }

// Confere um token TOTP (tolera espaços). Retorna boolean.
async function conferir(secret, token) {
  const t = String(token || '').replace(/\s+/g, '');
  if (!secret || !/^\d{6}$/.test(t)) return false;
  try { const r = await otp.verify({ token: t, secret }); return !!r.valid; }
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

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code || '').trim().toLowerCase()).digest('hex');
}

module.exports = { novoSecret, uri, qrDataUrl, conferir, gerarRecovery, hashCode };

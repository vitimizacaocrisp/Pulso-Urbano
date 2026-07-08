// Upload direto ao R2 via URL pré-assinada (PUT). fetch() não expõe progresso
// de upload — XMLHttpRequest sim. Suporta arquivos grandes (até 2 GB); o upload
// vai direto do navegador pro bucket, sem passar pelo backend.
//
// Requer que o CORS do bucket permita a ORIGEM do frontend (PUT). Em erro de
// rede sem status, quase sempre é CORS faltando.
export function uploadToR2(uploadUrl, file, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress && onProgress(100); resolve(); }
      else reject(new Error(`Falha no upload (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Erro de rede no upload. Verifique o CORS do bucket R2.'));
    xhr.onabort = () => reject(new Error('Upload cancelado.'));

    if (signal) signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

// Formata bytes p/ exibição (ex.: 1.5 GB).
export function formatBytes(n) {
  if (!n && n !== 0) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB (espelha o backend)

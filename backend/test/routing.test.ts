// Regressão do 404 "Cannot GET /index.js" em produção (Vercel).
//
// A Vercel passou a entregar ao Express o caminho *reescrito*. Um vercel.json
// com { source: "/(.*)", destination: "/index.js" } fazia toda requisição chegar
// como GET /index.js — rota que não existe. A API não pode depender de rewrite
// para achar a entrada: a Vercel detecta o Express sozinha (export default app).
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-routing';

import app from '../src/index';

let server: http.Server;
let base = '';

before(async () => {
  server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => { await new Promise((r) => server.close(r)); });

test('GET /health responde 200 no caminho original', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(((await res.json()) as { ok: boolean }).ok, true);
});

test('o Express não expõe /index.js (só chega lá quem reescreve para o arquivo)', async () => {
  const res = await fetch(`${base}/index.js`);
  assert.strictEqual(res.status, 404);
});

test('backend/vercel.json não reescreve requisições para um arquivo de entrada', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));
  const destinos = [...(cfg.rewrites || []), ...(cfg.routes || [])].map((r: any) => r.destination || r.dest);
  assert.deepStrictEqual(destinos.filter((d: string) => /index\.(js|ts)$/.test(d)), []);
  assert.strictEqual(cfg.builds, undefined, '"builds" desativa a detecção automática do Express');
});

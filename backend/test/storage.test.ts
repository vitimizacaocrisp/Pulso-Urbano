import { test } from 'node:test';
import assert from 'node:assert';
import { isAllowedFileType, isAllowedAttachmentType, MAX_UPLOAD_BYTES, ALLOWED_MIME_TYPES } from '../src/services/storage';

test('imagem PNG é permitida', () => {
  assert.strictEqual(isAllowedFileType('image/png', 'x.png'), true);
});

test('HTML é bloqueado (vetor de XSS)', () => {
  assert.strictEqual(isAllowedFileType('text/html', 'x.html'), false);
});

test('JavaScript é bloqueado', () => {
  assert.strictEqual(isAllowedFileType('application/javascript', 'x.js'), false);
});

test('SVG é bloqueado (XSS inline)', () => {
  assert.strictEqual(isAllowedFileType('image/svg+xml', 'x.svg'), false);
});

test('mime ausente + extensão permitida (.py) passa', () => {
  assert.strictEqual(isAllowedFileType(undefined, 'script.py'), true);
});

test('MIME perigoso não passa só por usar extensão permitida', () => {
  assert.strictEqual(isAllowedFileType('text/html', 'planilha.csv'), false);
});

test('categoria de mídia precisa corresponder ao MIME', () => {
  assert.strictEqual(isAllowedAttachmentType('video', 'video/mp4', 'filme.mp4'), true);
  assert.strictEqual(isAllowedAttachmentType('video', 'audio/mpeg', 'faixa.mp3'), false);
  assert.strictEqual(isAllowedAttachmentType('cover', 'application/pdf', 'capa.pdf'), false);
  assert.strictEqual(isAllowedAttachmentType('dado', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'base.xlsx'), true);
});

test('código e notebook só passam nas categorias próprias', () => {
  assert.strictEqual(isAllowedAttachmentType('codigo', 'application/javascript', 'app.js'), true);
  assert.strictEqual(isAllowedAttachmentType('anexo', 'application/javascript', 'app.js'), false);
  assert.strictEqual(isAllowedAttachmentType('anexo', undefined, 'modelo.py'), false);
  assert.strictEqual(isAllowedAttachmentType('notebook', 'application/json', 'estudo.ipynb'), true);
  assert.strictEqual(isAllowedAttachmentType('notebook', 'text/html', 'estudo.ipynb'), false);
});

test('SQLite é aceito como dado, mas não como anexo genérico', () => {
  assert.strictEqual(isAllowedAttachmentType('dado', 'application/vnd.sqlite3', 'base.sqlite'), true);
  assert.strictEqual(isAllowedAttachmentType('dado', 'application/octet-stream', 'base.db'), true);
  assert.strictEqual(isAllowedAttachmentType('anexo', 'application/octet-stream', 'base.db'), false);
});

test('arquivos acima de 512 MB continuam suportados', () => {
  assert.ok(MAX_UPLOAD_BYTES > 512 * 1024 * 1024);
});

test('tudo ausente não quebra e retorna false', () => {
  assert.strictEqual(isAllowedFileType(undefined, undefined), false);
});

test('limite de upload é 2 GB', () => {
  assert.strictEqual(MAX_UPLOAD_BYTES, 2 * 1024 * 1024 * 1024);
});

test('allowlist não contém tipos executáveis/markup', () => {
  for (const dangerous of ['text/html', 'text/javascript', 'application/javascript', 'image/svg+xml']) {
    assert.ok(!ALLOWED_MIME_TYPES.includes(dangerous), `${dangerous} não deveria estar na allowlist`);
  }
});

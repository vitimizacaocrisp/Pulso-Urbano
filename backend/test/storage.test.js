const { test } = require('node:test');
const assert = require('node:assert');
const { isAllowedFileType, MAX_UPLOAD_BYTES, ALLOWED_MIME_TYPES } = require('../src/services/storage');

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

test('tudo ausente não quebra e retorna false', () => {
  assert.strictEqual(isAllowedFileType(undefined, undefined), false);
});

test('limite de upload é 50 MB', () => {
  assert.strictEqual(MAX_UPLOAD_BYTES, 50 * 1024 * 1024);
});

test('allowlist não contém tipos executáveis/markup', () => {
  for (const dangerous of ['text/html', 'text/javascript', 'application/javascript', 'image/svg+xml']) {
    assert.ok(!ALLOWED_MIME_TYPES.includes(dangerous), `${dangerous} não deveria estar na allowlist`);
  }
});

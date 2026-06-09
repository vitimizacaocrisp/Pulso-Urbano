const { test } = require('node:test');
const assert = require('node:assert');
const { validateAnalysisPayload } = require('../src/validators/analysisValidator');

test('título ausente é rejeitado', () => {
  assert.strictEqual(validateAnalysisPayload({}), 'O título é obrigatório.');
});

test('título só com espaços é rejeitado', () => {
  assert.strictEqual(validateAnalysisPayload({ title: '   ' }), 'O título é obrigatório.');
});

test('conteúdo ausente é rejeitado', () => {
  assert.strictEqual(validateAnalysisPayload({ title: 'x' }), 'O conteúdo é obrigatório.');
});

test('payload mínimo válido passa', () => {
  assert.strictEqual(validateAnalysisPayload({ title: 'x', content: 'y' }), null);
});

test('título no limite (255) passa', () => {
  assert.strictEqual(validateAnalysisPayload({ title: 'a'.repeat(255), content: 'y' }), null);
});

test('título acima do limite (256) é rejeitado', () => {
  const err = validateAnalysisPayload({ title: 'a'.repeat(256), content: 'y' });
  assert.match(err, /title/);
});

test('nationality acima do limite (101) é rejeitada', () => {
  const err = validateAnalysisPayload({ title: 'x', content: 'y', nationality: 'a'.repeat(101) });
  assert.match(err, /nationality/);
});

test('campo opcional nulo é aceito', () => {
  assert.strictEqual(validateAnalysisPayload({ title: 'x', content: 'y', subtitle: null }), null);
});

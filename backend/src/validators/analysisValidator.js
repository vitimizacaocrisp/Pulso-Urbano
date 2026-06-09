// Validação leve do payload de análise.
// Os campos abaixo são VARCHAR no schema; sem checagem, um valor maior
// que o limite gera erro 500 do Postgres em vez de um 400 claro.
const FIELD_MAX = { title: 255, subtitle: 255, studyPeriod: 100, author: 255, nationality: 100, coverImagePath: 500 };

function validateAnalysisPayload(body) {
  if (!body.title || !String(body.title).trim())     return 'O título é obrigatório.';
  if (!body.content || !String(body.content).trim()) return 'O conteúdo é obrigatório.';
  for (const [field, max] of Object.entries(FIELD_MAX)) {
    const val = body[field];
    if (val != null && String(val).length > max) {
      return `O campo "${field}" excede o limite de ${max} caracteres.`;
    }
  }
  return null;
}

module.exports = { validateAnalysisPayload, FIELD_MAX };

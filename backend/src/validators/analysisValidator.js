// Validação do payload de análise com Zod.
// Mantém o contrato legado: `validateAnalysisPayload(body)` devolve uma STRING
// com a primeira mensagem de erro, ou `null` se válido. Assim os callers (rotas)
// e os testes existentes seguem funcionando sem mudança.
const { z } = require('zod');

// Campos VARCHAR no schema do banco — sem checagem, um valor acima do limite
// gera erro 500 do Postgres em vez de um 400 claro.
const FIELD_MAX = { title: 255, subtitle: 255, studyPeriod: 100, author: 255, nationality: 100, coverImagePath: 500 };

// String opcional (aceita null/undefined) com teto de tamanho e mensagem legada.
const maxStr = (field) =>
  z.string().max(FIELD_MAX[field], `O campo "${field}" excede o limite de ${FIELD_MAX[field]} caracteres.`).nullish();

const analysisSchema = z.object({
  title: z.preprocess(
    (v) => (v == null ? '' : String(v)),
    z.string().trim()
      .min(1, 'O título é obrigatório.')
      .max(FIELD_MAX.title, `O campo "title" excede o limite de ${FIELD_MAX.title} caracteres.`)
  ),
  content: z.preprocess(
    (v) => (v == null ? '' : String(v)),
    z.string().trim().min(1, 'O conteúdo é obrigatório.')
  ),
  subtitle:       maxStr('subtitle'),
  studyPeriod:    maxStr('studyPeriod'),
  author:         maxStr('author'),
  nationality:    maxStr('nationality'),
  coverImagePath: maxStr('coverImagePath'),
}).passthrough(); // demais campos (category, tag, content HTML, meta...) passam livres

function validateAnalysisPayload(body) {
  const result = analysisSchema.safeParse(body || {});
  if (result.success) return null;
  // Prioriza título e conteúdo (ordem histórica das mensagens); senão, o 1º erro.
  const issues = result.error.issues;
  const byPath = (p) => issues.find((i) => i.path[0] === p);
  return (byPath('title') || byPath('content') || issues[0]).message;
}

module.exports = { validateAnalysisPayload, FIELD_MAX, analysisSchema };

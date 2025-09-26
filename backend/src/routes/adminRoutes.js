const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { asyncHandler, verifyToken, upload } = require('../middleware/middlewares.js');
const { sql, testConnection } = require('../db/dbConnect');

const router = express.Router();

// ================= AUTENTICAÇÃO ADMIN =================
router.post('/auth', asyncHandler(async (req, res) => {
  testConnection();
  const { email, password } = req.body;

  const isAdminEmail = email === process.env.ADMIN_EMAIL;
  const isPasswordCorrect = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

  if (!isAdminEmail || !isPasswordCorrect) {
    return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
  }

  const payload = { email: process.env.ADMIN_EMAIL };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({ success: true, message: 'Login bem-sucedido!', token });
}));

// ================= ROTAS PRIVADAS =================

// CRUD de análises
router.post('/analyses', verifyToken, upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'documentFile', maxCount: 1 },
  { name: 'dataFile', maxCount: 1 }
]), asyncHandler(async (req, res) => {
  testConnection();

  const { title, tag, description, content, externalLink } = req.body;
  const coverImagePath = req.files?.coverImage?.[0]?.path || null;
  const documentFilePath = req.files?.documentFile?.[0]?.path || null;
  const dataFilePath = req.files?.dataFile?.[0]?.path || null;

  const result = await sql`
    INSERT INTO analyses (title, tag, description, content, external_link, 
      cover_image_path, document_file_path, data_file_path)
    VALUES (${title}, ${tag}, ${description}, ${content}, ${externalLink},
      ${coverImagePath}, ${documentFilePath}, ${dataFilePath})
    RETURNING id;
  `;

  res.status(201).json({
    success: true,
    message: `Análise "${title}" publicada com sucesso!`,
    analysisId: result[0]?.id
  });
}));

router.get('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  if (!result.length) return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  res.json({ success: true, data: result[0] });
}));

router.put('/analyses/:id', verifyToken, upload.none(), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, tag, description, content, externalLink } = req.body;
  await sql`
    UPDATE analyses SET title=${title}, tag=${tag}, description=${description}, 
    content=${content}, external_link=${externalLink} WHERE id=${id}
  `;
  res.json({ success: true, message: 'Análise atualizada com sucesso!' });
}));

router.delete('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await sql`DELETE FROM analyses WHERE id=${id} RETURNING title`;
  if (!result.length) return res.status(404).json({ success: false, message: 'Não encontrada.' });
  res.json({ success: true, message: `Análise "${result[0].title}" excluída.` });
}));

// Execução de query SQL arbitrária (cuidado!)
router.post('/sql-query', verifyToken, asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ success: false, error: 'A query não pode estar vazia.' });

  if (query.trim().split(';').filter(s => s.length > 0).length > 1) {
    return res.status(400).json({ success: false, error: 'Múltiplos comandos SQL não são permitidos.' });
  }

  try {
    const result = await sql(query);
    if (/^\s*select/i.test(query)) {
      res.json({ success: true, data: result });
    } else {
      res.json({ success: true, data: [{ status: 'Comando executado com sucesso.', linhas_afetadas: result.length ?? 'N/A' }] });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao executar query.' });
  }
}));

// Dashboard data
router.get('/dashboard-data', verifyToken, asyncHandler(async (req, res) => {
  const [statsResult, recentAnalysesResult, chartDataResult] = await Promise.all([
    sql`SELECT (SELECT COUNT(*) FROM analyses) AS "totalAnalyses",
                (SELECT COUNT(*) FROM analyses WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS "newThisMonth",
                (SELECT COUNT(DISTINCT tag) FROM analyses WHERE tag IS NOT NULL AND tag != '') AS "uniqueTags"`,
    sql`SELECT id, title, tag, TO_CHAR(created_at, 'DD/MM/YYYY') as created_date 
        FROM analyses ORDER BY created_at DESC LIMIT 5`,
    sql`WITH months AS (
          SELECT generate_series(
            date_trunc('month', CURRENT_DATE) - interval '5 months',
            date_trunc('month', CURRENT_DATE), '1 month'::interval
          ) AS month
        )
        SELECT TO_CHAR(months.month, 'Mon') AS month_name,
               COUNT(analyses.id) AS publication_count
        FROM months
        LEFT JOIN analyses ON date_trunc('month', analyses.created_at) = months.month
        GROUP BY months.month ORDER BY months.month`
  ]);

  res.json({
    success: true,
    data: {
      stats: statsResult[0],
      recentAnalyses: recentAnalysesResult,
      chartData: {
        labels: chartDataResult.map(r => r.month_name),
        data: chartDataResult.map(r => r.publication_count)
      }
    }
  });
}));

router.get('/data', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: `Dados secretos para ${req.user.email}`,
    data: [
      { id: 1, pesquisa: 'Impacto da Urbanização', ano: 2023 },
      { id: 2, pesquisa: 'Vitimização em Capitais', ano: 2024 }
    ]
  });
});

module.exports = router;

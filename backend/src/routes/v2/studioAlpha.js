// ─────────────────────────────────────────────────────────────────────
// Documentos do Editor Alpha (GraphicStudio).
//
// Guarda o JSON do editor, que é a fonte da verdade da página. O HTML é sempre
// derivado do JSON no cliente; nunca é armazenado, para não existirem duas
// versões da mesma página podendo divergir.
//
// Rotas de admin ficam sob /api/admin (o router é montado lá e cada rota exige
// `requireAdmin`). A leitura pública é uma rota só, e devolve exclusivamente
// documento com `status = 'publicado'`.
//
// Requer a migração database/migrations/2026_studio_documents.sql.
// ─────────────────────────────────────────────────────────────────────
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { requireAdmin } = require('../../middleware/authV2');
const { q } = require('../../db/pool');
const audit = require('../../services/audit');

const err = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });

/**
 * Degradação graciosa enquanto a migração não foi aplicada.
 *
 * `42P01` é "tabela não existe" no Postgres. Sem isto, quem sobe o código antes
 * da migração recebe um erro 500 genérico e vai procurar bug no lugar errado.
 */
const semTabela = (res, erro) => {
  if (erro?.code !== '42P01') return false;
  err(res, 503, 'migracao_pendente',
    'Editor Alpha indisponível: aplique database/migrations/2026_studio_documents.sql.');
  return true;
};

const comTabela = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (erro) {
    if (!semTabela(res, erro)) next(erro);
  }
};

// Teto de tamanho do documento. Um documento do editor é texto e geometria;
// imagens entram por URL. 2 MB já é muito, e sem limite um POST grande viraria
// um jeito barato de encher o banco.
const LIMITE_JSON = '2mb';

const slugSchema = z.string().trim().min(1).max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve ser minúsculo, separado por hífen');

/**
 * Validação de forma, não de schema completo.
 *
 * O schema do editor é Zod no frontend e evolui junto com a interface;
 * duplicá-lo aqui criaria duas definições para divergirem. O servidor confere o
 * que precisa para armazenar com segurança — versão, tamanho e as chaves
 * estruturais — e o cliente valida o resto ao abrir. Documento corrompido
 * quebra o editor de quem abriu, não o banco.
 */
const documentoSchema = z.object({
  schemaVersion: z.literal(2),
  documentId: z.string().min(1).max(128),
  metadata: z.object({
    title: z.string().min(1).max(500),
    slug: slugSchema,
  }).passthrough(),
  pages: z.array(z.unknown()).min(1).max(100),
  nodes: z.record(z.string(), z.unknown()),
}).passthrough();

const corpoSchema = z.object({
  slug: slugSchema.optional(),
  status: z.enum(['rascunho', 'publicado']).default('rascunho'),
  // Versão que o cliente abriu. Ausente = documento novo. Se não bater com a
  // do banco, outra pessoa gravou no meio do caminho.
  versao: z.number().int().positive().optional(),
  documento: documentoSchema,
});

// ── listagem (admin) ─────────────────────────────────────────────────
router.get('/studio-docs', requireAdmin, comTabela(async (req, res) => {
  const { rows } = await q(
    `SELECT id, slug, titulo, status, atualizado_por, created_at, updated_at
       FROM studio_documents
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 200`);
  res.json({ success: true, data: { itens: rows } });
}));

// ── abrir um documento para edição (admin) ───────────────────────────
router.get('/studio-docs/:slug', requireAdmin, comTabela(async (req, res) => {
  const slug = slugSchema.safeParse(req.params.slug);
  if (!slug.success) return err(res, 400, 'slug_invalido', 'Slug inválido.');
  const { rows } = await q(
    `SELECT slug, titulo, status, versao, documento, updated_at
       FROM studio_documents
      WHERE slug = $1 AND deleted_at IS NULL`, [slug.data]);
  if (!rows.length) return err(res, 404, 'nao_encontrado', 'Documento não encontrado.');
  res.json({ success: true, data: rows[0] });
}));

// ── salvar / publicar (admin) ────────────────────────────────────────
// Um endpoint só, com UPSERT por slug: salvar e publicar são a mesma escrita
// mudando `status`. Dois endpoints permitiriam publicar uma versão diferente da
// que está salva.
router.put('/studio-docs', requireAdmin, express.json({ limit: LIMITE_JSON }), comTabela(async (req, res) => {
  const corpo = corpoSchema.safeParse(req.body);
  if (!corpo.success) {
    return err(res, 400, 'validacao_falhou', corpo.error.issues[0]?.message || 'Documento inválido.');
  }
  const { documento, status, versao } = corpo.data;
  const slug = corpo.data.slug || documento.metadata.slug;
  const titulo = documento.metadata.title;

  const atual = await q(
    `SELECT id, versao, titulo, documento, status, atualizado_por
       FROM studio_documents WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
  const existente = atual.rows[0];

  // Concorrência otimista: duas pessoas na mesma página não se sobrescrevem em
  // silêncio. Quem chegou depois recebe 409 e decide o que fazer.
  if (existente && versao !== undefined && versao !== existente.versao) {
    return err(res, 409, 'versao_desatualizada',
      `Outra pessoa salvou esta página (versão ${existente.versao}). Abra do servidor antes de gravar.`);
  }

  // Arquiva o estado anterior antes de sobrescrever.
  if (existente) {
    await q(
      `INSERT INTO studio_document_versions
              (documento_id, versao, titulo, documento, status, atualizado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (documento_id, versao) DO NOTHING`,
      [existente.id, existente.versao, existente.titulo,
       JSON.stringify(existente.documento), existente.status, existente.atualizado_por]);
  }

  const { rows } = await q(
    `INSERT INTO studio_documents (slug, titulo, documento, status, atualizado_por)
          VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO UPDATE
            SET titulo = EXCLUDED.titulo,
                documento = EXCLUDED.documento,
                status = EXCLUDED.status,
                atualizado_por = EXCLUDED.atualizado_por,
                versao = studio_documents.versao + 1,
                updated_at = now(),
                deleted_at = NULL
       RETURNING id, slug, titulo, status, versao, updated_at`,
    [slug, titulo, JSON.stringify(documento), status, req.auth.id]);

  await audit.log(req, {
    atorTipo: 'admin',
    atorId: req.auth.id,
    acao: status === 'publicado' ? 'studio_doc_publicar' : 'studio_doc_salvar',
    alvoTipo: 'studio_document',
    alvoId: rows[0].id,
    dados: { slug },
  });

  res.json({ success: true, data: rows[0] });
}));

// ── histórico (admin) ────────────────────────────────────────────────
router.get('/studio-docs/:slug/versoes', requireAdmin, comTabela(async (req, res) => {
  const slug = slugSchema.safeParse(req.params.slug);
  if (!slug.success) return err(res, 400, 'slug_invalido', 'Slug inválido.');
  const { rows } = await q(
    `SELECT v.versao, v.titulo, v.status, v.atualizado_por, v.created_at
       FROM studio_document_versions v
       JOIN studio_documents d ON d.id = v.documento_id
      WHERE d.slug = $1
      ORDER BY v.versao DESC
      LIMIT 50`, [slug.data]);
  res.json({ success: true, data: { itens: rows } });
}));

// ── restaurar uma versão (admin) ─────────────────────────────────────
// Restaurar é uma gravação como outra qualquer: o estado atual vai para o
// histórico e a versão continua subindo. Assim dá para desfazer a restauração.
router.post('/studio-docs/:slug/restaurar/:versao', requireAdmin, comTabela(async (req, res) => {
  const slug = slugSchema.safeParse(req.params.slug);
  const versao = Number.parseInt(req.params.versao, 10);
  if (!slug.success || !Number.isInteger(versao) || versao < 1) {
    return err(res, 400, 'parametros_invalidos', 'Slug ou versão inválidos.');
  }
  const alvo = await q(
    `SELECT v.titulo, v.documento, d.id, d.versao AS versao_atual, d.titulo AS titulo_atual,
            d.documento AS documento_atual, d.status AS status_atual, d.atualizado_por AS autor_atual
       FROM studio_document_versions v
       JOIN studio_documents d ON d.id = v.documento_id
      WHERE d.slug = $1 AND v.versao = $2 AND d.deleted_at IS NULL`, [slug.data, versao]);
  if (!alvo.rows.length) return err(res, 404, 'nao_encontrado', 'Versão não encontrada.');
  const linha = alvo.rows[0];

  await q(
    `INSERT INTO studio_document_versions
            (documento_id, versao, titulo, documento, status, atualizado_por)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (documento_id, versao) DO NOTHING`,
    [linha.id, linha.versao_atual, linha.titulo_atual,
     JSON.stringify(linha.documento_atual), linha.status_atual, linha.autor_atual]);

  // Restaura como rascunho: republicar deve ser uma decisão explícita.
  const { rows } = await q(
    `UPDATE studio_documents
        SET titulo = $2, documento = $3, status = 'rascunho',
            versao = versao + 1, atualizado_por = $4, updated_at = now()
      WHERE id = $1
      RETURNING id, slug, titulo, status, versao, updated_at`,
    [linha.id, linha.titulo, JSON.stringify(linha.documento), req.auth.id]);

  await audit.log(req, {
    atorTipo: 'admin',
    atorId: req.auth.id,
    acao: 'studio_doc_restaurar',
    alvoTipo: 'studio_document',
    alvoId: linha.id,
    dados: { slug: slug.data, versao },
  });
  res.json({ success: true, data: rows[0] });
}));

// ── despublicar / excluir (admin) ────────────────────────────────────
// Exclusão lógica: o documento sai do ar mas continua recuperável, como o resto
// do sistema faz com `deleted_at`.
router.delete('/studio-docs/:slug', requireAdmin, comTabela(async (req, res) => {
  const slug = slugSchema.safeParse(req.params.slug);
  if (!slug.success) return err(res, 400, 'slug_invalido', 'Slug inválido.');
  const { rows } = await q(
    `UPDATE studio_documents
        SET deleted_at = now(), status = 'rascunho', updated_at = now()
      WHERE slug = $1 AND deleted_at IS NULL
      RETURNING id`, [slug.data]);
  if (!rows.length) return err(res, 404, 'nao_encontrado', 'Documento não encontrado.');
  await audit.log(req, {
    atorTipo: 'admin',
    atorId: req.auth.id,
    acao: 'studio_doc_excluir',
    alvoTipo: 'studio_document',
    alvoId: rows[0].id,
    dados: { slug: slug.data },
  });
  res.json({ success: true, data: { slug: slug.data } });
}));

// ── leitura pública ──────────────────────────────────────────────────
// Sem autenticação e sem `optionalAuth`: só documento publicado sai daqui, então
// não há nada que dependa de quem está pedindo.
const publico = express.Router();
publico.get('/api/studio/:slug', comTabela(async (req, res) => {
  const slug = slugSchema.safeParse(req.params.slug);
  if (!slug.success) return err(res, 400, 'slug_invalido', 'Slug inválido.');
  const { rows } = await q(
    `SELECT slug, titulo, documento, updated_at
       FROM studio_documents
      WHERE slug = $1 AND status = 'publicado' AND deleted_at IS NULL`, [slug.data]);
  if (!rows.length) return err(res, 404, 'nao_encontrado', 'Página não encontrada.');
  res.json({ success: true, data: rows[0] });
}));

module.exports = { admin: router, publico };

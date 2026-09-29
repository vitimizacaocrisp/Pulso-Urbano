/**
 * Enquanto o Editor Alpha for experimental, nada vai para o backend: o rascunho
 * vive só no navegador de quem editou. A chave é versionada para permitir
 * invalidar rascunhos antigos sem quebrar a tela.
 *
 * Fica num módulo próprio porque o editor escreve e a tela de preview lê — se a
 * string fosse duplicada, renomear uma ponta quebraria a outra em silêncio.
 */
export const ALPHA_STORAGE_KEY = 'pulso:editor-alpha:documento:v1';

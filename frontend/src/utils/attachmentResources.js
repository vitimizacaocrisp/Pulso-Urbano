const CODE_EXTENSIONS = new Set([
  'py', 'pyw', 'r', 'sql', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'sh',
  'bash', 'ps1', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'go', 'rs', 'rb',
  'php', 'swift', 'kt', 'kts', 'lua', 'yaml', 'yml', 'toml',
]);
const DATA_EXTENSIONS = new Set([
  'csv', 'tsv', 'xls', 'xlsx', 'json', 'geojson', 'db', 'sqlite', 'sqlite3', 'parquet',
]);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'rtf', 'txt', 'md']);

export const PREVIEW_LIMIT_BYTES = 32 * 1024 * 1024;

export function fileExtension(file) {
  const name = String(file?.nome || file?.name || '').toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1) : '';
}

export function attachmentGroup(file) {
  const type = String(file?.tipo || '').toLowerCase();
  const ext = fileExtension(file);
  if (type === 'notebook' || ext === 'ipynb') return 'notebook';
  if (type === 'codigo' || CODE_EXTENSIONS.has(ext)) return 'code';
  if (type === 'dado' || DATA_EXTENSIONS.has(ext)) return 'data';
  if (type === 'documento' || DOCUMENT_EXTENSIONS.has(ext)) return 'document';
  if (type === 'imagem') return 'image';
  if (type === 'audio' || type === 'video') return 'media';
  return 'attachment';
}

export function partitionAttachments(files = []) {
  const groups = { notebooks: [], code: [], data: [], documents: [], images: [], media: [], attachments: [] };
  for (const file of files) {
    const group = attachmentGroup(file);
    if (group === 'notebook') groups.notebooks.push(file);
    else if (group === 'code') groups.code.push(file);
    else if (group === 'data') groups.data.push(file);
    else if (group === 'document') groups.documents.push(file);
    else if (group === 'image') groups.images.push(file);
    else if (group === 'media') groups.media.push(file);
    else groups.attachments.push(file);
  }
  return groups;
}

export function canPreviewInMemory(file) {
  const size = Number(file?.tamanho || file?.size || 0);
  return !size || size <= PREVIEW_LIMIT_BYTES;
}

export function nbviewerUrl(signedUrl) {
  if (!signedUrl) return 'https://nbviewer.org/';
  return `https://nbviewer.org/url/${signedUrl.replace(/^https?:\/\//, '')}`;
}

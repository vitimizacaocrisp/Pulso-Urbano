import { describe, expect, it } from 'vitest';
import { attachmentGroup, canPreviewInMemory, partitionAttachments } from './attachmentResources';

describe('attachmentResources', () => {
  it('separa anexos legados pela extensão', () => {
    expect(attachmentGroup({ tipo: 'anexo', nome: 'estudo.ipynb' })).toBe('notebook');
    expect(attachmentGroup({ tipo: 'anexo', nome: 'modelo.py' })).toBe('code');
    expect(attachmentGroup({ tipo: 'anexo', nome: 'base.sqlite' })).toBe('data');
    expect(attachmentGroup({ tipo: 'anexo', nome: 'relatorio.pdf' })).toBe('document');
  });

  it('respeita as novas categorias explícitas', () => {
    const groups = partitionAttachments([
      { tipo: 'codigo', nome: 'sem-extensao' },
      { tipo: 'notebook', nome: 'analise.json' },
      { tipo: 'anexo', nome: 'pacote.zip' },
    ]);
    expect(groups.code).toHaveLength(1);
    expect(groups.notebooks).toHaveLength(1);
    expect(groups.attachments).toHaveLength(1);
  });

  it('não carrega arquivos gigantes automaticamente na memória', () => {
    expect(canPreviewInMemory({ tamanho: 1024 })).toBe(true);
    expect(canPreviewInMemory({ tamanho: 40 * 1024 * 1024 })).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildStandaloneHtml,
  countEphemeralAssets,
  escapeHtml,
  suggestedFileName,
} from './exportHtml';

describe('escapeHtml', () => {
  it('neutraliza marcação vinda do título do documento', () => {
    expect(escapeHtml('<script>alert(1)</script>'))
      .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('aspas "e" \'apóstrofos\''))
      .toBe('aspas &quot;e&quot; &#39;apóstrofos&#39;');
  });
});

describe('suggestedFileName', () => {
  it('tira acento, espaço e pontuação', () => {
    expect(suggestedFileName('Relatório Anual 2026')).toBe('relatorio-anual-2026.html');
    expect(suggestedFileName('   ')).toBe('documento.html');
  });

  it('sempre termina em .html', () => {
    expect(suggestedFileName('Página')).toMatch(/\.html$/);
  });
});

describe('countEphemeralAssets', () => {
  it('conta os arquivos que não sobrevivem à exportação', () => {
    const corpo = '<img src="blob:http://x/1"><a href="blob:http://x/2"></a><img src="https://ok/3.png">';
    expect(countEphemeralAssets(corpo)).toBe(2);
    expect(countEphemeralAssets('<img src="https://ok/3.png">')).toBe(0);
  });
});

describe('buildStandaloneHtml', () => {
  const opcoes = {
    title: 'Minha página',
    bodyHtml: '<div data-graphicstudio-document="d1"></div>',
    css: '.x{color:red}',
  };

  it('monta um documento completo com o corpo e o CSS embutidos', () => {
    const html = buildStandaloneHtml(opcoes);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Minha página</title>');
    expect(html).toContain('.x{color:red}');
    expect(html).toContain(opcoes.bodyHtml);
  });

  it('escapa o título, que vem do documento do usuário', () => {
    const html = buildStandaloneHtml({ ...opcoes, title: '</title><script>x</script>' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;/title&gt;');
  });

  it('só inclui o script de encaixe quando o tamanho da prancheta é conhecido', () => {
    expect(buildStandaloneHtml(opcoes)).not.toContain('gs-viewport\')');
    const comEncaixe = buildStandaloneHtml({ ...opcoes, board: { width: 1200, height: 900 } });
    expect(comEncaixe).toContain("getElementById('gs-viewport')");
    expect(comEncaixe).toContain('1200');
  });

  it('inclui a folha de fontes quando informada', () => {
    const html = buildStandaloneHtml({ ...opcoes, fontsHref: 'https://fonts.example/css?family=X' });
    expect(html).toContain('rel="stylesheet" href="https://fonts.example/css?family=X"');
  });
});

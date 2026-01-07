import * as monaco from 'monaco-editor';

export const mediaTypeLabels = {
    'image': 'Imagem',
    'audio': 'Áudio',
    'video': 'Vídeo',
    'notebook': 'Notebook Python',
    'script': 'Script',
    'document': 'Documento (PDF/Word)',
    'data': 'Base de Dados (CSV/Excel)',
    'link': 'Link Externo'
};

export const getAcceptAttribute = (type) => {
    switch(type) {
        case 'image': return 'image/*';
        case 'audio': return 'audio/*';
        case 'video': return 'video/*';
        case 'notebook': return '.ipynb,.html';
        case 'script': return '.py,.js,.r,.txt,.sh';
        case 'document': return '.pdf,.doc,.docx,.ppt,.pptx';
        case 'data': return '.csv,.xls,.xlsx,.json,.xml';
        default: return '*/*';
    }
};

export const formatText = (editor, type) => {
    if (!editor) return;

    const selection = editor.getSelection();
    const model = editor.getModel();
    const text = model.getValueInRange(selection);
    const position = selection.getStartPosition();

    let newText = '';
    let range = null;

    switch (type) {
        case 'bold':
            newText = text ? `**${text}**` : '**texto**';
            break;
        case 'italic':
            newText = text ? `*${text}*` : '*texto*';
            break;
        case 'heading':
            newText = text ? `# ${text}` : '# Título';
            break;
        case 'list':
            newText = text ? `- ${text}` : '- Item da lista';
            break;
        case 'code':
            if (text) newText = `\`${text}\``;
            else newText = '```\n\n```';
            break;
        case 'link':
            newText = text ? `[${text}](url)` : '[texto](url)';
            break;
        case 'image':
            newText = text ? `![${text}](url)` : '![alt](url)';
            break;
        case 'quote':
            newText = text ? `> ${text}` : '> Citação';
            break;
    }

    if (type === 'code' && !text) {
        range = new monaco.Range(position.lineNumber, position.column, position.lineNumber + 2, 3);
    } else {
        range = new monaco.Range(
            position.lineNumber, 
            position.column, 
            position.lineNumber, 
            position.column + newText.length
        );
    }

    if (text) {
        editor.executeEdits('', [{ range: selection, text: newText, forceMoveMarkers: true }]);
    } else {
        editor.executeEdits('', [{ range: range || selection, text: newText, forceMoveMarkers: true }]);
        
        // Ajuste do cursor
        if ((type === 'bold' || type === 'italic') && !text) {
             const newPos = new monaco.Position(position.lineNumber, position.column + 2);
             editor.setPosition(newPos);
             editor.focus();
        } else if (type === 'code' && !text) {
            const newPos = new monaco.Position(position.lineNumber + 1, 1);
            editor.setPosition(newPos);
            editor.focus();
        }
    }
};

export const processCodeContent = async (content, type, containerId) => {
    const escapeHTML = (str) => str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));

    const cellStyle = "margin-bottom: 15px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; background: #fff;";
    const codeStyle = "background: #1e1e1e; color: #d4d4d4; padding: 12px; font-family: monospace; font-size: 13px; line-height: 1.5; white-space: pre; overflow-x: auto;";
    const outputStyle = "background: #f8f9fa; color: #333; padding: 12px; font-family: monospace; font-size: 12px; border-top: 1px solid #eee; white-space: pre-wrap;";

    if (type === 'notebook') {
        try {
            const data = typeof content === 'string' ? JSON.parse(content) : content;
            if (!data.cells) throw new Error();

            const cellsHtml = data.cells
                .filter(cell => cell.cell_type === 'code')
                .map((cell, index) => {
                    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                    let outputContent = '';
                    if (cell.outputs) {
                        outputContent = cell.outputs.map(out => {
                            if (out.text) return Array.isArray(out.text) ? out.text.join('') : out.text;
                            if (out.data && out.data['text/plain']) return Array.isArray(out.data['text/plain']) ? out.data['text/plain'].join('') : out.data['text/plain'];
                            return '';
                        }).join('\n').trim();
                    }

                    const display = index === 0 ? 'block' : 'none';
                    
                    return `
<div class="nb-cell-${containerId}" style="${cellStyle} display: ${display};" data-index="${index}">
    <div style="background:#333; color:#aaa; padding:5px 10px; font-size:10px;">CÉLULA ${index + 1}</div>
    <div style="${codeStyle}">${escapeHTML(source)}</div>
    ${outputContent ? `<div style="${outputStyle}"><strong style="font-size:10px; color:#999;">SAÍDA:</strong>\n${escapeHTML(outputContent)}</div>` : ''}
    <div class="btn-container" style="padding: 10px; text-align: center;"></div>
</div>`;
                }).join('');

            const showMoreScript = `
                (function() {
                    const cells = document.querySelectorAll('.nb-cell-${containerId}');
                    const btn = document.createElement('button');
                    btn.innerText = 'MOSTRAR MAIS +';
                    btn.style = 'padding: 8px 16px; border-radius: 20px; border: 1px solid #0ea5e9; background: white; color: #0ea5e9; font-weight: bold; cursor: pointer; font-size: 11px;';
                    
                    let currentIndex = 0;
                    const moveButton = () => {
                        if (currentIndex < cells.length - 1) {
                            currentIndex++;
                            cells[currentIndex].style.display = 'block';
                            cells[currentIndex].querySelector('.btn-container').appendChild(btn);
                            if (currentIndex === cells.length - 1) btn.style.display = 'none';
                        }
                    };
                    btn.onclick = moveButton;
                    if (cells.length > 1) cells[0].querySelector('.btn-container').appendChild(btn);
                })()`;

            return `${cellsHtml}<img src="/" onerror="${showMoreScript}" style="display:none;">`;
        } catch (e) { return '<div style="color:red;">Erro ao processar Notebook.</div>'; }
    }
    return `<div style="${codeStyle}">${escapeHTML(content)}</div>`;
};

export const generateUrlMediaHtml = async (url, type) => {
    let htmlToInsert = '';
    const containerId = `nb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const cardBase = "border:1px solid #e0e0e0; border-radius:12px; padding:16px; background:#fff; margin:15px 0; font-family:sans-serif; box-shadow:0 4px 6px rgba(0,0,0,0.05); text-align: left;";
    const btnBase = "display:inline-block; margin-right:8px; padding:8px 14px; border-radius:8px; text-decoration:none; font-size:11px; font-weight:bold; color:#fff; text-transform: uppercase; cursor:pointer; border:none;";

    if (type === 'notebook' || type === 'script') {
        let rawUrl = url;
        let displayUrl = url;
        let colabUrl = '';
        let nbViewerUrl = '';

        if (url.includes('github')) {
            const path = url.replace(/^https?:\/\//, '');
            const parts = path.split('/');
            const user = parts[1];
            const repo = parts[2];

            if (path.startsWith('raw.githubusercontent.com')) {
                const branch = parts[3];
                const filePath = parts.slice(4).join('/');
                displayUrl = `https://github.com/${user}/${repo}/blob/${branch}/${filePath}`;
                rawUrl = url;
            } else {
                const branch = parts[4];
                const filePath = parts.slice(5).join('/');
                rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
                displayUrl = url;
            }
            const ghSuffix = displayUrl.split('github.com/')[1];
            colabUrl = `https://colab.research.google.com/github/${ghSuffix.replace('/blob/', '/blob/')}`;
            nbViewerUrl = `https://nbviewer.org/github/${ghSuffix}`;
        } else {
            nbViewerUrl = `https://nbviewer.org/urls/${url.replace(/^https?:\/\//, '')}`;
        }

        const codeContent = await processCodeContent(await (await fetch(rawUrl)).text(), type, containerId);

        htmlToInsert = `
<div style="${cardBase}">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px;">
        <div style="display:flex; align-items:center;">
            <span style="font-size:28px; margin-right:12px;">${type === 'notebook' ? '🐍' : '📜'}</span>
            <strong>${type === 'notebook' ? 'Notebook Python' : 'Script'}</strong>
        </div>
    </div>
    <div style="margin-bottom:15px;">
        <a href="${displayUrl}" target="_blank" style="${btnBase} background:#24292e;">📂 GitHub</a>
        <button onclick="
            const el = document.getElementById('${containerId}');
            const isHidden = el.style.display === 'none';
            el.style.display = isHidden ? 'block' : 'none';
            this.innerHTML = isHidden ? '收 CODE' : '👁️ CODE';
            this.style.background = isHidden ? '#ef4444' : '#10b981';
        " style="${btnBase} background:#10b981;">👁️ CODE</button>
        ${colabUrl ? `<a href="${colabUrl}" target="_blank" style="${btnBase} background:#f9ab00;">🚀 Colab</a>` : ''}
        <a href="${nbViewerUrl}" target="_blank" style="${btnBase} background:#3f51b5;">👀 NBViewer</a>
    </div>
    <div id="${containerId}" style="display:none; margin-top:10px;">${codeContent}</div>
</div>`;
    } else if (type === 'image') {
        htmlToInsert = `<div style="text-align:center; margin:20px 0;"><img src="${url}" style="max-width:100%; border-radius:8px; border:1px solid #ddd;"><p style="color:#666; font-size:12px; margin-top:8px;">🖼️ Imagem Externa</p></div>`;
    } else if (type === 'audio') {
        htmlToInsert = `<div style="${cardBase} background:#f8fafc;"><div style="margin-bottom:8px;">🎵 <strong>Áudio Externo</strong></div><audio controls src="${url}" style="width:100%;"></audio></div>`;
    } else if (type === 'video') {
        htmlToInsert = `<div style="margin:20px 0; background:#000; border-radius:12px; overflow:hidden;"><video controls src="${url}" style="width:100%; display:block;"></video><div style="padding:8px; color:#fff; font-size:11px; text-align:center; background:#222;">🎥 VÍDEO EXTERNO</div></div>`;
    } else {
        htmlToInsert = `<div style="${cardBase} border-left:4px solid #2196F3;"><span style="margin-right:8px;">🔗</span><a href="${url}" target="_blank" style="color:#2196F3; font-weight:bold; text-decoration:none;">Acessar Link Externo</a></div>`;
    }

    return htmlToInsert;
};

export const generateFileMediaHtml = async (file, type) => {
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const placeholderId = `${type}_${uniqueSuffix}`;
    const containerId = `file_${uniqueSuffix}`;
    const blobUrl = URL.createObjectURL(file);
    
    const cardBase = "border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc; margin:15px 0; font-family:sans-serif;";
    const dlBtn = "background:#0ea5e9; color:white; padding:8px 16px; border-radius:8px; text-decoration:none; font-size:11px; font-weight:bold;";

    let html = '';

    if (type === 'notebook' || type === 'script') {
        const codeContent = await processCodeContent(await file.text(), type, containerId);

        html = `
<div style="${cardBase}">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px;">
        <div style="display:flex; align-items:center;">
            <span style="font-size:28px; margin-right:12px;">${type === 'notebook' ? '🐍' : '📜'}</span>
            <strong>${file.name}</strong>
        </div>
        <div>
            <button onclick="
                const el = document.getElementById('${containerId}');
                const isHidden = el.style.display === 'none';
                el.style.display = isHidden ? 'block' : 'none';
                this.innerHTML = isHidden ? '收 FECHAR' : '👁️ VER CÓDIGO';
            " style="background:#6366f1; color:white; border:none; padding:8px 12px; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer; margin-right:8px;">👁️ VER CÓDIGO</button>
            <a href="${placeholderId}" download="${file.name}" style="${dlBtn}">⬇️ BAIXAR</a>
        </div>
    </div>
    <div id="${containerId}" style="display:none;">${codeContent}</div>
</div>`;
    } else if (type === 'image') {
        html = `<div style="text-align:center; margin:20px 0;"><img src="${placeholderId}" style="max-width:100%; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"><div style="margin-top:8px;"><a href="${placeholderId}" download="${file.name}" style="color:#0ea5e9; font-size:12px; text-decoration:none; font-weight:bold;">💾 Baixar Imagem</a></div></div>`;
    } else if (type === 'video') {
        html = `
<div style="margin:20px 0; background:#000; border-radius:12px; overflow:hidden;">
    <video controls src="${placeholderId}" style="width:100%; display:block;"></video>
    <div style="padding:10px; background:#1e293b; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#fff; font-size:12px;">🎥 ${file.name}</span>
        <a href="${placeholderId}" download="${file.name}" style="color:#38bdf8; font-size:12px; font-weight:bold; text-decoration:none;">Download</a>
    </div>
</div>`;
    } else if (type === 'audio') {
        html = `<div style="${cardBase} background:#fff7ed; border-color:#fdba74;"><div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>🎵 <strong>${file.name}</strong></span><a href="${placeholderId}" download="${file.name}" style="color:#ea580c; font-size:11px; font-weight:bold; text-decoration:none;">Download</a></div><audio controls src="${placeholderId}" style="width:100%;"></audio></div>`;
    } else {
        const isData = type === 'data';
        const color = isData ? '#8b5cf6' : '#6366f1';
        html = `
<div style="${cardBase} border-left:5px solid ${color};">
    <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center;">
            <span style="font-size:24px; margin-right:12px;">${isData ? '📊' : '📄'}</span>
            <div><strong style="color:#333; display:block;">${file.name}</strong><span style="font-size:11px; color:#888;">Arquivo de ${type}</span></div>
        </div>
        <a href="${placeholderId}" download="${file.name}" style="background:${color}; color:white; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:11px; font-weight:bold;">BAIXAR</a>
    </div>
</div>`;
    }

    return { html, placeholderId, blobUrl };
};

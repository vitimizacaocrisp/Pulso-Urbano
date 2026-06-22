import * as monaco from 'monaco-editor';

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

import { ref, nextTick } from 'vue';
import * as monaco from 'monaco-editor';
import { formatText } from '@/utils/editorUtils.js';

// Encapsula o ciclo de vida do editor Monaco (markdown) usado nas telas de
// admin. Antes, ContentManagerView e EditAnalysisView duplicavam ~50 linhas
// idênticas de create/dispose/ensure/insert.
//
// Uso:
//   const editor = useMonacoMarkdown({
//     isDark,
//     getContent: () => form.value.content,
//     onChange: (v) => { form.value.content = v; },
//   });
//   // template: <div ref="editor.editorEl" />
export function useMonacoMarkdown({ isDark, getContent, onChange, language = 'markdown' }) {
  const editorEl = ref(null);
  let instance = null;

  const applyFormat = (type) => { if (instance) formatText(instance, type); };

  const init = () => {
    if (!editorEl.value || instance) return;
    instance = monaco.editor.create(editorEl.value, {
      value: getContent() || '',
      language,
      theme: isDark.value ? 'vs-dark' : 'vs',
      fontSize: 14, lineNumbers: 'on', wordWrap: 'on',
      minimap: { enabled: false }, scrollBeyondLastLine: false,
      automaticLayout: true, tabSize: 2, insertSpaces: true,
      renderLineHighlight: 'line',
    });
    instance.onDidChangeModelContent(() => onChange(instance.getValue()));
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => applyFormat('bold'));
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => applyFormat('italic'));
  };

  const dispose = () => { if (instance) { instance.dispose(); instance = null; } };

  // Garante o editor montado quando ele deve existir (chame após mudar
  // isPreview/isDoc). `shouldExist` evita criar quando o editor está oculto.
  const ensure = async (shouldExist = true) => {
    if (!shouldExist) return;
    await nextTick();
    if (editorEl.value && !instance) init();
    else setTimeout(() => instance?.layout(), 50);
  };

  const setValue = (v) => {
    if (!instance) return;
    instance.setValue(v || '');
    instance.setScrollPosition({ scrollTop: 0 });
    instance.layout();
  };

  const insertText = (text) => {
    if (!instance) return false; // caller decide o fallback
    const pos = instance.getPosition();
    instance.executeEdits('', [{
      range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
      text: '\n' + text + '\n', forceMoveMarkers: true,
    }]);
    instance.focus();
    return true;
  };

  const setTheme = (dark) => { if (instance) monaco.editor.setTheme(dark ? 'vs-dark' : 'vs'); };
  const hasInstance = () => !!instance;

  return { editorEl, init, dispose, ensure, setValue, insertText, applyFormat, setTheme, hasInstance };
}

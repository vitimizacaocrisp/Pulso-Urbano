import { ref, nextTick, type Ref } from 'vue'
import { formatText } from '@/utils/editorUtils'

type Monaco = typeof import('monaco-editor')
type EditorInstance = ReturnType<Monaco['editor']['create']>

interface UseMonacoMarkdownOptions {
  isDark: Ref<boolean>
  getContent: () => string
  onChange: (value: string) => void
  language?: string
}

// Encapsula o ciclo de vida do editor Monaco (markdown) usado nas telas de
// admin. Antes, ContentManagerView e EditAnalysisView duplicavam ~50 linhas
// idênticas de create/dispose/ensure/insert.
//
// monaco-editor é import()-ado dinamicamente (nunca estático): toca `self`/
// `window` no carregamento do módulo, o que quebra SSR se importado no topo
// do arquivo — mesmo só client-side, um import estático ainda entra no grafo
// de módulos renderizado no servidor.
//
// Uso:
//   const editor = useMonacoMarkdown({
//     isDark,
//     getContent: () => form.value.content,
//     onChange: (v) => { form.value.content = v; },
//   });
//   // template: <div ref="editor.editorEl" />
export function useMonacoMarkdown({ isDark, getContent, onChange, language = 'markdown' }: UseMonacoMarkdownOptions) {
  const editorEl = ref<HTMLElement | null>(null)
  let instance: EditorInstance | null = null
  let monaco: Monaco | null = null

  const applyFormat = (type: string) => { if (instance && monaco) formatText(monaco, instance, type) }

  const init = async () => {
    if (!editorEl.value || instance) return
    monaco = await import('monaco-editor')
    if (!editorEl.value || instance) return // o alvo pode ter sumido durante o await
    instance = monaco.editor.create(editorEl.value, {
      value: getContent() || '',
      language,
      theme: isDark.value ? 'vs-dark' : 'vs',
      fontSize: 14, lineNumbers: 'on', wordWrap: 'on',
      minimap: { enabled: false }, scrollBeyondLastLine: false,
      automaticLayout: true, tabSize: 2, insertSpaces: true,
      renderLineHighlight: 'line',
    })
    instance.onDidChangeModelContent(() => onChange(instance!.getValue()))
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => applyFormat('bold'))
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => applyFormat('italic'))
  }

  const dispose = () => { if (instance) { instance.dispose(); instance = null } }

  // Garante o editor montado quando ele deve existir (chame após mudar
  // isPreview/isDoc). `shouldExist` evita criar quando o editor está oculto.
  const ensure = async (shouldExist = true) => {
    if (!shouldExist) return
    await nextTick()
    if (editorEl.value && !instance) await init()
    else setTimeout(() => instance?.layout(), 50)
  }

  const setValue = (v: string) => {
    if (!instance) return
    instance.setValue(v || '')
    instance.setScrollPosition({ scrollTop: 0 })
    instance.layout()
  }

  const insertText = (text: string): boolean => {
    if (!instance || !monaco) return false // caller decide o fallback
    const pos = instance.getPosition()!
    instance.executeEdits('', [{
      range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
      text: '\n' + text + '\n', forceMoveMarkers: true,
    }])
    instance.focus()
    return true
  }

  const setTheme = (dark: boolean) => { if (instance && monaco) monaco.editor.setTheme(dark ? 'vs-dark' : 'vs') }
  const hasInstance = () => !!instance

  return { editorEl, init, dispose, ensure, setValue, insertText, applyFormat, setTheme, hasInstance }
}

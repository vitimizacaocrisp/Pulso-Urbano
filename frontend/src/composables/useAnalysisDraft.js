import { ref } from 'vue';
import { openDB } from 'idb';

// Persistência de rascunho da tela "Nova Análise": campos em localStorage +
// arquivos (capa/mídia) em IndexedDB, com expiração de 1h. Extraído de
// ContentManagerView para enxugar o componente.
//
// Uso:
//   const draft = useAnalysisDraft({
//     form, contentMediaMap, imagePreviewUrl,
//     onContentLoaded: (html) => editor.setValue(html),
//   });
//   draft.loadDraft(); draft.start(); // start = autosave com debounce
const DB_NAME = 'pu-draft-db', STORE = 'files', DRAFT_KEY = 'pu-new-draft';
const TTL_MS = 3600_000; // 1h

export function useAnalysisDraft({ form, contentMediaMap, imagePreviewUrl, onContentLoaded }) {
  const lastSaved = ref('');
  let dbPromise = null;
  let timer = null;

  const getDb = () => {
    if (!dbPromise) dbPromise = openDB(DB_NAME, 1, { upgrade(db) { db.createObjectStore(STORE); } });
    return dbPromise;
  };
  const dbPut = async (k, v) => { (await getDb()).put(STORE, v, k); };
  const dbGet = async (k) => (await getDb()).get(STORE, k);
  const dbClear = async () => { (await getDb()).clear(STORE); };

  const saveDraft = async () => {
    const d = JSON.parse(JSON.stringify({ ...form.value, coverImage: null }));
    if (form.value.coverImage instanceof File) {
      const k = `draft_cover_${Date.now()}`;
      await dbPut(k, form.value.coverImage);
      d.coverImage = { key: k, name: form.value.coverImage.name };
    }
    d.mediaMap = {};
    for (const [id, { file, type }] of contentMediaMap.value.entries()) {
      if (file instanceof File) {
        const k = `draft_media_${id}`;
        await dbPut(k, file);
        d.mediaMap[id] = { key: k, type };
      }
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ d, exp: Date.now() + TTL_MS }));
    lastSaved.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const loadDraft = async () => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.exp < Date.now()) { await dbClear(); localStorage.removeItem(DRAFT_KEY); return; }
    const d = saved.d;
    if (d.coverImage?.key) {
      const f = await dbGet(d.coverImage.key);
      if (f) { d.coverImage = f; imagePreviewUrl.value = URL.createObjectURL(f); }
      else d.coverImage = null;
    }
    if (d.mediaMap) {
      for (const [id, { key, type }] of Object.entries(d.mediaMap)) {
        const f = await dbGet(key);
        if (f) contentMediaMap.value.set(id, { file: f, blobUrl: URL.createObjectURL(f), type });
      }
      delete d.mediaMap;
    }
    Object.assign(form.value, d);
    if (d.content) onContentLoaded?.(d.content);
  };

  const clearDraft = async () => {
    await dbClear();
    localStorage.removeItem(DRAFT_KEY);
  };

  // Autosave com debounce de 2s. Retorna o watcher stop para cleanup.
  const scheduleSave = () => {
    clearTimeout(timer);
    timer = setTimeout(saveDraft, 2000);
  };

  return { lastSaved, saveDraft, loadDraft, clearDraft, scheduleSave };
}

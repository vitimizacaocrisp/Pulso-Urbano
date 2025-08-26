<template>
  <div>
    <div v-if="isConfirmationModalVisible" class="modal-overlay" @click="handleCancel">
      <div class="modal-content" @click.stop>
        <h4>Confirmar Execução</h4>
        <p>Tem a certeza de que deseja executar a seguinte query diretamente na base de dados?</p>
        <pre class="query-preview">{{ queryToConfirm }}</pre>
        <div class="modal-actions">
          <button class="btn-cancel" @click="handleCancel">Cancelar</button>
          <button class="btn-confirm" @click="handleConfirm">Executar</button>
        </div>
      </div>
    </div>

    <header class="main-header-bar">
      <h1>Terminal de Banco de Dados</h1>
      <p>Execute consultas diretamente no banco de dados. Use com responsabilidade.</p>
    </header>

    <section class="content-section">
      <div class="sql-terminal">
        <div class="terminal-output" ref="output">
          <div v-for="item in history" :key="item.id" class="history-item">
            <div class="command-line">
              <span class="prompt">&gt;</span>
              <span class="command-text">{{ item.command }}</span>
            </div>

            <div v-if="item.loading" class="result-loading">
              <div class="spinner"></div>
              <span>Executando...</span>
              <p v-if="item.showColdStartMessage" class="cold-start-warning">
                O servidor pode estar a "acordar". A primeira consulta do dia pode demorar até 1 minuto. Por favor, aguarde.
              </p>
            </div>

            <div v-else-if="item.error" class="result-error">
              <pre>{{ item.error }}</pre>
            </div>
            <div v-else-if="item.result" class="result-data">
              <p v-if="item.result.length === 0" class="no-rows">Consulta executada com sucesso. Nenhuma linha retornada.</p>
              <table v-else>
                <thead>
                  <tr>
                    <th v-for="header in Object.keys(item.result[0])" :key="header">{{ header }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in item.result" :key="rowIndex">
                    <td v-for="(value, colIndex) in row" :key="colIndex">{{ value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="terminal-input-area">
          <span class="prompt">&gt;</span>
          <textarea
            v-model="currentQuery"
            placeholder="Escreva seu comando SQL aqui e pressione Ctrl+Enter para executar"
            @keydown.enter.ctrl.prevent="triggerConfirmation"
            ref="input"
          ></textarea>
          <button @click="triggerConfirmation" :disabled="isLoading">Executar</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';

// [MODIFICADO] O seu URL do backend
const API_URL = 'http://localhost:3000/api/sql-query';

const currentQuery = ref('');
const history = ref([]);
const isLoading = ref(false);
const output = ref(null);
const input = ref(null);
const isConfirmationModalVisible = ref(false);
const queryToConfirm = ref('');

onMounted(() => {
  input.value.focus();
});

const triggerConfirmation = () => {
  const command = currentQuery.value.trim();
  if (!command || isLoading.value) return;
  queryToConfirm.value = command;
  isConfirmationModalVisible.value = true;
};

const handleCancel = () => {
  isConfirmationModalVisible.value = false;
  queryToConfirm.value = '';
  input.value.focus();
};

const handleConfirm = () => {
  isConfirmationModalVisible.value = false;
  executeQuery(queryToConfirm.value);
  queryToConfirm.value = '';
};

async function executeQuery(command) {
  const token = localStorage.getItem('authToken');
  if (!token) {
      history.value.push({
          id: Date.now(),
          command,
          error: 'Erro de Autenticação: Token não encontrado. Por favor, faça login novamente.'
      });
      return;
  }

  isLoading.value = true;
  const historyId = Date.now();
  // [MODIFICADO] Adicionamos uma propriedade para controlar a mensagem de "cold start"
  history.value.push({ id: historyId, command, loading: true, showColdStartMessage: false });
  currentQuery.value = '';

  await nextTick();
  output.value.scrollTop = output.value.scrollHeight;

  // [NOVO] Lógica para exibir a mensagem de "cold start" após 4 segundos
  const coldStartTimer = setTimeout(() => {
    const historyEntry = history.value.find(h => h.id === historyId);
    if (historyEntry && historyEntry.loading) {
      historyEntry.showColdStartMessage = true;
    }
  }, 4000);

  // [NOVO] Lógica de timeout para o fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // Timeout de 90 segundos

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal, // Adiciona o controller de timeout
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: command }),
    });

    const data = await response.json();
    const historyEntry = history.value.find(h => h.id === historyId);

    if (response.ok && data.success) {
      historyEntry.result = data.data;
    } else {
      throw new Error(data.error || `Erro HTTP ${response.status}`);
    }
  } catch (err) {
    const historyEntry = history.value.find(h => h.id === historyId);
    if (err.name === 'AbortError') {
      historyEntry.error = 'Erro: O pedido demorou demasiado tempo a responder (timeout). O servidor pode estar offline ou sobrecarregado.';
    } else {
      historyEntry.error = err.message;
    }
  } finally {
    clearTimeout(coldStartTimer); // Limpa o timer da mensagem
    clearTimeout(timeoutId);     // Limpa o timer do timeout
    const historyEntry = history.value.find(h => h.id === historyId);
    if(historyEntry) historyEntry.loading = false;
    isLoading.value = false;
    
    await nextTick();
    output.value.scrollTop = output.value.scrollHeight;
    input.value.focus();
  }
}
</script>

<style scoped>
.cold-start-warning {
  font-size: 0.8em;
  color: #f1c40f; /* amarelo */
  margin-top: 5px;
  padding-left: 0;
}

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background-color: #2d2d2d; padding: 2rem; border-radius: 8px; width: 90%; max-width: 550px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); border: 1px solid #444; color: #d4d4d4; }
.modal-content h4 { margin-top: 0; color: white; font-size: 1.5rem; }
.query-preview { background-color: #1e1e1e; padding: 1rem; border-radius: 4px; font-family: 'Courier New', Courier, monospace; color: #9cdcfe; white-space: pre-wrap; word-break: break-all; max-height: 150px; overflow-y: auto; border: 1px solid #333; }
.modal-actions { margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem; }
.modal-actions button { padding: 0.6rem 1.2rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.9rem; }
.btn-cancel { background-color: #555; color: white; }
.btn-confirm { background-color: #e53935; color: white; }
.main-header-bar { background-color: white; padding: 1.5rem 2rem; border-bottom: 1px solid #dee2e6; }
.content-section { padding: 2rem; }
.sql-terminal { font-family: 'Courier New', Courier, monospace; background-color: #1e1e1e; color: #d4d4d4; border: 1px solid #333; border-radius: 4px; display: flex; flex-direction: column; height: 600px; margin-top: 1rem; }
.terminal-output { flex-grow: 1; overflow-y: auto; padding: 10px; }
.history-item { margin-bottom: 15px; }
.prompt { color: #6a9955; margin-right: 8px; }
.command-text { color: #9cdcfe; }
.terminal-input-area { display: flex; padding: 5px 10px; border-top: 1px solid #333; }
.terminal-input-area textarea { flex-grow: 1; background: transparent; border: none; color: #d4d4d4; font-family: inherit; font-size: 1em; resize: none; height: 60px; }
.terminal-input-area textarea:focus { outline: none; }
.terminal-input-area button { background-color: #0e639c; color: white; border: none; padding: 5px 10px; margin-left: 10px; cursor: pointer; }
.terminal-input-area button:disabled { background-color: #555; cursor: not-allowed; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.result-loading { display: flex; flex-direction: column; align-items: flex-start; padding-left: 20px; color: #f1c40f; }
.spinner { width: 16px; height: 16px; border: 3px solid rgba(255, 255, 255, 0.3); border-top-color: #f1c40f; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px; }
.result-error { color: #f44747; padding-left: 20px; }
.result-error pre { margin: 0; white-space: pre-wrap; }
.result-data table { width: 100%; border-collapse: collapse; margin-top: 5px; background-color: #252526; font-size: 0.9em; }
.result-data th, .result-data td { border: 1px solid #444; padding: 6px 8px; text-align: left; }
.result-data th { background-color: #0e639c; color: white; }
.no-rows { padding-left: 20px; color: #888; }
</style>
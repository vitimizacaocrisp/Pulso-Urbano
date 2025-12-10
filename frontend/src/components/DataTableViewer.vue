<template>
  <div class="data-table-viewer">
    <div v-if="isLoading" class="loading-bar">
        <div class="bar"></div>
    </div>
    
    <div v-if="error" class="error-msg">
        <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>
    
    <div v-if="tableData.rows.length > 0" class="custom-table-container">
      <table class="modern-table">
        <thead>
          <tr>
            <th v-for="header in tableData.headers" :key="header">
                {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in tableData.rows" :key="index">
            <td v-for="header in tableData.headers" :key="header">
                {{ row[header] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const props = defineProps({
  file: { type: File, required: true },
});

const emit = defineEmits(['data-parsed']);

const isLoading = ref(false);
const error = ref(null);
const tableData = ref({ headers: [], rows: [] });

const parseFile = (fileToParse) => {
  if (!fileToParse) return;

  isLoading.value = true;
  error.value = null;
  tableData.value = { headers: [], rows: [] };
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const fileName = fileToParse.name.toLowerCase();
      
      if (fileName.endsWith('.csv')) {
        Papa.parse(e.target.result, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const safeRows = results.data.slice(0, 100); // Preview limit
            if (safeRows.length > 0) {
              tableData.value.headers = results.meta.fields;
              tableData.value.rows = safeRows;
              emit('data-parsed', { headers: results.meta.fields, rows: results.data });
            } else {
               throw new Error("Arquivo CSV vazio.");
            }
          },
        });
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 1) {
            const headers = jsonData[0];
            const rows = jsonData.slice(1).map(rowArray => {
                let rowObject = {};
                headers.forEach((h, i) => { rowObject[h] = rowArray[i]; });
                return rowObject;
            });
            tableData.value.headers = headers;
            tableData.value.rows = rows.slice(0, 100);
            emit('data-parsed', { headers, rows });
        } else {
             throw new Error("Planilha vazia.");
        }
      } else {
         throw new Error("Formato não suportado.");
      }
    } catch (err) {
      error.value = err.message || 'Erro ao processar arquivo.';
      emit('data-parsed', { headers: [], rows: [] });
    } finally {
      isLoading.value = false;
    }
  };
  reader.readAsBinaryString(fileToParse);
};

watch(() => props.file, (newFile) => {
    if (newFile) parseFile(newFile);
}, { immediate: true });
</script>

<style scoped>
.data-table-viewer { width: 100%; }

.custom-table-container {
    max-height: 400px;
    overflow: auto;
    border-radius: 6px;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.02);
}

.modern-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    font-family: 'Inter', sans-serif;
}

.modern-table th {
    background: #f8fafc;
    position: sticky; top: 0; z-index: 10;
    color: #475569;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.75rem 1rem;
    border-bottom: 2px solid #e2e8f0;
    white-space: nowrap;
}

.modern-table td {
    padding: 0.6rem 1rem;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.modern-table tbody tr:hover {
    background-color: #f1f5f9;
}

/* Loading Bar */
.loading-bar { width: 100%; height: 4px; background: #e2e8f0; overflow: hidden; border-radius: 2px; }
.loading-bar .bar {
    width: 50%; height: 100%; background: #6366f1;
    animation: loading 1s infinite linear; transform-origin: 0% 50%;
}
@keyframes loading {
    0% { transform: translateX(0) scaleX(0); }
    40% { transform: translateX(0) scaleX(0.4); }
    100% { transform: translateX(100%) scaleX(0.5); }
}

.error-msg {
    padding: 1rem; color: #b91c1c; background: #fef2f2;
    border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem;
}
</style>
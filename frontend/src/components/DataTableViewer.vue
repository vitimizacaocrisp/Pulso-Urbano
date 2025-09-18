<template>
  <div class="data-table-viewer">
    <div v-if="isLoading" class="feedback-loading">A processar o ficheiro...</div>
    <div v-if="error" class="feedback-error">{{ error }}</div>
    <div v-if="tableData.rows.length > 0" class="table-container">
      <table>
        <thead>
          <tr>
            <th v-for="header in tableData.headers" :key="header">{{ header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in tableData.rows" :key="index">
            <td v-for="header in tableData.headers" :key="header">{{ row[header] }}</td>
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
  file: {
    type: File,
    required: true,
  },
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
            if (results.data.length > 0) {
              tableData.value.headers = results.meta.fields;
              tableData.value.rows = results.data;
              emit('data-parsed', { headers: results.meta.fields, rows: results.data });
            } else {
               error.value = 'O ficheiro CSV está vazio ou mal formatado.';
               emit('data-parsed', { headers: [], rows: [] });
            }
          },
        });
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 1 && jsonData[0].length > 0) {
            const headers = jsonData[0];
            const rows = jsonData.slice(1).map(rowArray => {
                let rowObject = {};
                headers.forEach((header, index) => { rowObject[header] = rowArray[index]; });
                return rowObject;
            });
            tableData.value.headers = headers;
            tableData.value.rows = rows;
            emit('data-parsed', { headers, rows });
        } else {
            error.value = 'A planilha do Excel está vazia.';
            emit('data-parsed', { headers: [], rows: [] });
        }
      } else {
        error.value = 'Formato de ficheiro não suportado para pré-visualização.';
        emit('data-parsed', { headers: [], rows: [] });
      }
    } catch (err) {
      error.value = `Ocorreu um erro ao processar o ficheiro: ${err.message}`;
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
.data-table-viewer{margin-bottom:2rem;font-size:.9rem}.table-container{max-height:400px;overflow:auto;border:1px solid #dee2e6;border-radius:4px}table{width:100%;border-collapse:collapse}th,td{padding:.75rem;text-align:left;border-bottom:1px solid #dee2e6;white-space:nowrap}thead th{background-color:#f8f9fa;position:sticky;top:0}tbody tr:nth-child(even){background-color:#f8f9fa}.feedback-loading,.feedback-error{padding:1rem;border-radius:4px;background-color:#e9ecef;text-align:center;margin-top:1rem}.feedback-error{background-color:#f8d7da;color:#721c24}
</style>
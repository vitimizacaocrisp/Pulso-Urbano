<template>
  <div>
    <!-- ANÁLISE -->
    <template v-if="tipo === 'analise'">
      <label class="wz-field"><span>Metodologia</span>
        <textarea class="wz-input" rows="4" v-model="sub.metodologia" maxlength="20000"></textarea>
      </label>
      <label class="wz-field"><span>Indicadores de destaque (texto livre)</span>
        <textarea class="wz-input" rows="2" v-model="sub.indicadores" placeholder="Ex.: 3 números-chave"></textarea>
      </label>
    </template>

    <!-- ACADÊMICO -->
    <template v-else-if="tipo === 'academico'">
      <div class="row2">
        <label class="wz-field"><span>Tipo de produção</span><input class="wz-input" v-model="sub.tipo_producao" maxlength="40" placeholder="Artigo, Tese…" /></label>
        <label class="wz-field"><span>Ano</span><input class="wz-input" v-model="sub.ano" inputmode="numeric" /></label>
      </div>
      <label class="wz-field"><span>Veículo</span><input class="wz-input" v-model="sub.veiculo" maxlength="255" /></label>
      <div class="row2">
        <label class="wz-field"><span>DOI</span><input class="wz-input" v-model="sub.doi" maxlength="120" /></label>
        <label class="wz-field"><span>Qualis</span><input class="wz-input" v-model="sub.qualis" maxlength="4" /></label>
      </div>
      <div class="row2">
        <label class="wz-field"><span>ISSN</span><input class="wz-input" v-model="sub.issn" maxlength="20" /></label>
        <label class="wz-field"><span>Orientador</span><input class="wz-input" v-model="sub.orientador" maxlength="160" /></label>
      </div>
      <label class="wz-field"><span>Programa</span><input class="wz-input" v-model="sub.programa" maxlength="160" /></label>
    </template>

    <!-- DADO -->
    <template v-else-if="tipo === 'dado'">
      <div class="row2">
        <label class="wz-field"><span>Instrumento</span><input class="wz-input" v-model="sub.instrumento" maxlength="60" /></label>
        <label class="wz-field"><span>Formato</span><input class="wz-input" v-model="sub.formato" maxlength="40" placeholder="CSV, SPSS…" /></label>
      </div>
      <div class="row2">
        <label class="wz-field"><span>Tamanho da amostra</span><input class="wz-input" v-model="sub.tamanho_amostra" inputmode="numeric" /></label>
        <label class="wz-field"><span>Cobertura</span><input class="wz-input" v-model="sub.cobertura" maxlength="160" /></label>
      </div>
      <div class="row2">
        <label class="wz-field"><span>Período de coleta</span><input class="wz-input" v-model="sub.periodo_coleta" maxlength="60" /></label>
        <label class="wz-field"><span>Licença</span><input class="wz-input" v-model="sub.licenca" maxlength="60" placeholder="CC BY 4.0" /></label>
      </div>
      <label class="wz-field"><span>Metodologia amostral</span><textarea class="wz-input" rows="3" v-model="sub.metodologia_amostral" maxlength="20000"></textarea></label>
    </template>

    <!-- PODCAST -->
    <template v-else-if="tipo === 'podcast'">
      <div class="row2">
        <label class="wz-field"><span>Formato</span>
          <select class="wz-input" v-model="sub.formato_midia"><option :value="undefined">—</option><option value="audio">Áudio</option><option value="video">Vídeo</option></select>
        </label>
        <label class="wz-field"><span>Plataforma</span><input class="wz-input" v-model="sub.plataforma" maxlength="30" placeholder="Spotify" /></label>
      </div>
      <label class="wz-field"><span>Embed URL (Spotify/Apple/YouTube) *</span><input class="wz-input" v-model="sub.embed_url" maxlength="1000" placeholder="https://open.spotify.com/episode/…" /></label>
      <div class="row2">
        <label class="wz-field"><span>Nº do episódio</span><input class="wz-input" v-model="sub.numero_episodio" inputmode="numeric" /></label>
        <label class="wz-field"><span>Temporada</span><input class="wz-input" v-model="sub.temporada" inputmode="numeric" /></label>
      </div>
      <label class="wz-field"><span>Convidados</span><input class="wz-input" v-model="sub.convidados" maxlength="2000" /></label>
      <label class="wz-field"><span>Transcrição</span><textarea class="wz-input" rows="3" v-model="sub.transcricao"></textarea></label>
    </template>

    <!-- LIVRO -->
    <template v-else-if="tipo === 'livro'">
      <div class="row2">
        <label class="wz-field"><span>Editora</span><input class="wz-input" v-model="sub.editora" maxlength="160" /></label>
        <label class="wz-field"><span>Ano</span><input class="wz-input" v-model="sub.ano_pub" inputmode="numeric" /></label>
      </div>
      <div class="row2">
        <label class="wz-field"><span>ISBN</span><input class="wz-input" v-model="sub.isbn" maxlength="20" /></label>
        <label class="wz-field"><span>Edição</span><input class="wz-input" v-model="sub.edicao" maxlength="30" /></label>
      </div>
      <div class="row2">
        <label class="wz-field"><span>Nº de páginas</span><input class="wz-input" v-model="sub.num_paginas" inputmode="numeric" /></label>
        <label class="wz-field"><span>Link de compra (https)</span><input class="wz-input" v-model="sub.compra_url" maxlength="1000" /></label>
      </div>
      <label class="wz-field"><span>Sumário</span><textarea class="wz-input" rows="3" v-model="sub.sumario" maxlength="20000"></textarea></label>
    </template>

    <!-- VÍDEO -->
    <template v-else-if="tipo === 'video'">
      <div class="row2">
        <label class="wz-field"><span>Plataforma</span><input class="wz-input" v-model="sub.plataforma" maxlength="30" placeholder="YouTube" /></label>
        <label class="wz-field"><span>Duração (segundos)</span><input class="wz-input" v-model="sub.duracao_seg" inputmode="numeric" /></label>
      </div>
      <label class="wz-field"><span>Embed URL (YouTube/Vimeo) *</span><input class="wz-input" v-model="sub.embed_url" maxlength="1000" placeholder="https://www.youtube.com/watch?v=…" /></label>
      <label class="wz-field"><span>Legendas (.vtt, https)</span><input class="wz-input" v-model="sub.legendas_url" maxlength="1000" /></label>
    </template>
  </div>
</template>

<script setup>
import { inject } from 'vue';
defineProps({ tipo: { type: String, required: true } });
const sub = inject('wizSub');
</script>

<style scoped>
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 600px) { .row2 { grid-template-columns: 1fr; } }
</style>

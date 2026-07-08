<template>
  <div>
    <label class="wz-field"><span>Categorias (vírgula)</span>
      <input class="wz-input" :value="lista(form.categorias)" @input="form.categorias = arr($event.target.value)" placeholder="Vitimização, Homicídios" />
    </label>
    <label class="wz-field"><span>Tags (vírgula)</span>
      <input class="wz-input" :value="lista(form.tags)" @input="form.tags = arr($event.target.value)" placeholder="pnad, ibge" />
    </label>
    <label class="wz-field"><span>Fontes (vírgula)</span>
      <input class="wz-input" :value="lista(form.fontes)" @input="form.fontes = arr($event.target.value)" placeholder="IBGE, SENASP" />
    </label>
    <div class="row2">
      <label class="wz-field"><span>UFs (siglas, vírgula)</span>
        <input class="wz-input" :value="lista(form.ufs)" @input="form.ufs = ufArr($event.target.value)" placeholder="MG, SP" />
      </label>
      <label class="wz-field"><span>Municípios (vírgula)</span>
        <input class="wz-input" :value="lista(form.municipios)" @input="form.municipios = arr($event.target.value)" placeholder="Belo Horizonte" />
      </label>
    </div>
    <div class="row2">
      <label class="wz-field"><span>Período do estudo</span>
        <input class="wz-input" v-model="form.periodo_estudo" maxlength="100" placeholder="2009–2019" />
      </label>
      <label class="wz-field"><span>Nacionalidade / abrangência</span>
        <input class="wz-input" v-model="form.nacionalidade" maxlength="100" placeholder="Brasil" />
      </label>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue';
const form = inject('wizForm');
const lista = (a) => (a || []).join(', ');
const arr = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const ufArr = (s) => arr(s).map((x) => x.toUpperCase().slice(0, 2));
</script>

<style scoped>
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 600px) { .row2 { grid-template-columns: 1fr; } }
</style>

<template>
  <div>
    <label class="wz-field"><span>Título *</span>
      <input class="wz-input" v-model="form.titulo" maxlength="255" placeholder="Título da publicação" />
    </label>
    <label class="wz-field"><span>Subtítulo</span>
      <input class="wz-input" v-model="form.subtitulo" maxlength="255" />
    </label>
    <label class="wz-field"><span>Autores (separados por vírgula)</span>
      <input class="wz-input" :value="lista(form.autores)" @input="form.autores = arr($event.target.value)" placeholder="Fulano, Ciclana" />
    </label>
    <label class="wz-field"><span>Resumo *</span>
      <textarea class="wz-input" rows="4" v-model="form.resumo" maxlength="5000" placeholder="Breve resumo (aparece na prévia pública)"></textarea>
    </label>
  </div>
</template>

<script setup>
import { inject } from 'vue';
const form = inject('wizForm');
const lista = (a) => (a || []).join(', ');
const arr = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
</script>

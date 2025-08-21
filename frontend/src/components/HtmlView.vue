<template>
  <div v-html="content"></div>
</template>

<script>
export default {
  props: ["file"],
  data() {
    return { content: "" };
  },
  mounted() {
    fetch(this.file)
      .then(res => res.text())
      .then(html => {
        this.content = html;
      })
      .catch(err => {
        this.content = "<h1>❌ Erro ao carregar página</h1>";
        console.error("Erro ao carregar", this.file, err);
      });
  }
};
</script>

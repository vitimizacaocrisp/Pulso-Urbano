// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

// Config anterior (.eslintrc.json) era só `plugin:vue/vue3-essential` +
// `eslint:recommended` — bem mais permissiva que o preset padrão do
// @nuxt/eslint (que já vem com regras de TypeScript/estilo). Desligamos as
// regras novas de estilo/rigor que não existiam antes, pra não misturar
// centenas de nits pré-existentes no diff da migração pro Nuxt.
export default withNuxt({
  rules: {
    'vue/html-self-closing': 'off',
    'vue/attributes-order': 'off',
    'vue/first-attribute-linebreak': 'off',
    'vue/no-v-html': 'off',
    'vue/no-multiple-template-root': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/no-dynamic-delete': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-unused-vars': 'warn',
    'no-useless-assignment': 'off',
    'import/first': 'off',
  },
}, {
  // Testes do Studio nasceram em JS; @ts-nocheck neles é deliberado (ver 1ª linha).
  files: ['**/*.test.ts'],
  rules: { '@typescript-eslint/ban-ts-comment': 'off' },
})

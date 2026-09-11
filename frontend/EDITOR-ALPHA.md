# Editor Alpha — guia de finalização

Integração do **GraphicStudio** (editor visual estilo Figma/Canva, com documento
canônico em JSON) dentro do painel admin do Pulso Urbano, como uma terceira opção
de editor, restrita a administradores.

Este arquivo é a lista de tarefas para deixar a implementação **100% funcional**.
Ao terminar todos os itens abertos (`[ ]`) e passar na seção *Verificação*, o
editor está pronto para teste interno.

---

## 1. Como o editor funciona (contexto obrigatório)

- **A fonte da verdade é JSON, nunca HTML.** O documento é validado por um schema
  Zod (`src/studio/core/document.ts`). Todo comando de edição passa por
  `applyCommand`, que re-valida o documento inteiro. Documento inválido = exceção,
  não estado corrompido.
- **Geometria absoluta (schema v2).** Cada nó tem `frame` com `x`, `y`, `width`,
  `height`, `rotation` numéricos. Não existe layout de fluxo: quem posiciona é o
  documento, não o CSS. Isso é o que torna possível arrastar, girar e redimensionar
  como no Figma.
- **`name` vira `id` no HTML; `groups` viram `class`.** É assim que o JSON é
  traduzido para markup publicável.
- **A biblioteca é agnóstica de framework.** Depende só de `vue`, `@iconify/vue` e
  `zod`. Nada de Nuxt, nada de router, nada de backend.

Estrutura instalada:

```
src/studio/
  core/       document.ts (schema Zod)  command.ts (comandos)  index.ts
  editor/     GraphicStudioEditor.ts (o editor)  interaction.ts (matemática de
              rotação/resize/escala)  history.ts  clipboard.ts  layout.ts
              catalog.ts  assets.ts  index.ts
  renderer/   GraphicStudioRenderer.ts (JSON -> DOM)  index.ts
  seedDocument.ts   documento inicial de teste
  exportHtml.ts     empacota o render num HTML autossuficiente
  alphaStorage.js   chave do rascunho, compartilhada pelas duas telas
src/assets/css/studio.css          estilo do editor (tema escuro + claro)
src/assets/css/studio-render.css   estilo do documento renderizado, também
                                   embutido no HTML exportado
src/views/admin/EditorAlphaView.vue          a tela do editor
src/views/admin/EditorAlphaPreviewView.vue   preview e download
```

---

## 2. Já concluído

- [x] Rota `/admin/editor-alpha` em `src/router/index.js`, criada **como filha de
      `/admin`**, herdando o guard `requiresAdmin`. Só administrador logado abre.
- [x] Item "Editor Alpha" no menu (`src/views/admin/AdminLayout.vue`), com selo
      laranja `alpha`, presente na sidebar desktop e no drawer mobile.
- [x] `src/views/admin/EditorAlphaView.vue`: monta o editor, faixa de aviso
      declarando que é experimental e local, botão "Recomeçar", rascunho em
      `localStorage` (`pulso:editor-alpha:documento:v1`, debounce de 250 ms,
      auto-limpeza se o rascunho estiver corrompido).
- [x] Ponte de tema: o studio espera a classe `light` na raiz, o Pulso usa
      `data-theme` (`light` | `dark` | `comfort`). A view sincroniza os dois e
      limpa as classes ao sair. `comfort` conta como claro.
- [x] 12 dos 14 arquivos da biblioteca copiados (todo o `core`, todo o `renderer`
      e os utilitários do `editor`).
- [x] `migrations.ts` **deliberadamente não copiado**: ele converte documentos do
      schema v1, formato que nunca existiu no Pulso. Por isso `core/index.ts`
      exporta apenas `command` e `document`.
- [x] Imports sem extensão nos consumidores `.vue` (ver a regra em 3.5).
- [x] Chave do `localStorage` isolada em `src/studio/alphaStorage.js`, para o
      editor e o preview não dependerem de uma string duplicada.
- [x] Rota e tela de preview (`/admin/editor-alpha/preview`,
      `EditorAlphaPreviewView.vue`), renderizando o rascunho com o
      `GraphicStudioRenderer`; o botão Preview do editor já aponta para ela.
- [x] Correção de altura: `.admin-main` usa `min-height: 100vh`, ou seja, altura
      indefinida, o que faria o `height: 100%` do editor colapsar e o canvas ficar
      sem tamanho. A view adiciona a classe `has-alpha-editor` no `body` e um
      bloco de estilo não escopado torna a altura definida **apenas** enquanto a
      rota está montada. As outras telas do admin não mudam.

---

## 3. Passos de instalação (todos concluídos)

Ficam registrados porque são o caminho para reinstalar do zero ou repetir a
integração em outro projeto.

### 3.1 Instalar a dependência `zod`

Única dependência nova. O schema usa API da **v4** (`z.iso.datetime()`,
`z.record(chave, valor)` com dois argumentos); a v3 não serve.

```bash
npm install zod@^4
```

- [x] Instalado: `zod@^4.5.4` no `package.json`.

### 3.2 Copiar os dois arquivos restantes

São grandes (2660 e 2021 linhas) e devem ser copiados byte a byte, sem edição
manual. Origem = o projeto de mostragem do GraphicStudio.

```bash
copy "C:\Users\pedro\Documents\GitHub\GraphicStudio\.claude\worktrees\studio-framework-showcase-project-cdb2f2\projeto de mostragem\app\lib\studio\editor\GraphicStudioEditor.ts" "C:\Users\pedro\Documents\GitHub\Pulso-Urbano\frontend\src\studio\editor\GraphicStudioEditor.ts"
```

```bash
copy "C:\Users\pedro\Documents\GitHub\GraphicStudio\.claude\worktrees\studio-framework-showcase-project-cdb2f2\projeto de mostragem\app\assets\css\studio.css" "C:\Users\pedro\Documents\GitHub\Pulso-Urbano\frontend\src\assets\css\studio.css"
```

- [x] `src/studio/editor/GraphicStudioEditor.ts` (2660 linhas) copiado.
- [x] `src/assets/css/studio.css` (2021 linhas) copiado.

### 3.3 Remover a única dependência de Nuxt do editor

O editor foi escrito para Nuxt e chama `useGraphicTheme()`, um auto-import que não
existe aqui. São duas remoções em `src/studio/editor/GraphicStudioEditor.ts`.

**a)** Apague a linha (por volta da 151, dentro de `setup`):

```ts
    const { preference: themePreference, cycleTheme } = useGraphicTheme()
```

**b)** Apague o botão de tema da barra superior (por volta da linha 2535). É este
bloco inteiro, entre o `h('span', ...)` do "Salvo localmente" e o `h('a', ...)` do
"Preview":

```ts
          h('button', {
            type: 'button',
            class: 'gs-theme-toggle',
            title: message('themeToggle', 'Tema: {theme}', { theme: themePreference.value }),
            'aria-label': message('themeToggle', 'Tema: {theme}', { theme: themePreference.value }),
            onClick: cycleTheme,
          }, h(Icon, {
            icon: themePreference.value === 'dark'
              ? 'lucide:moon'
              : themePreference.value === 'light' ? 'lucide:sun' : 'lucide:monitor-cog',
          })),
```

Motivo de remover em vez de reimplementar: o painel admin já tem o próprio
alternador de tema, e a ponte da view (item 2) faz o editor seguir esse tema. Dois
controles competindo pelo mesmo estado é bug garantido.

- [x] Feito. `grep -rn "useGraphicTheme\|themePreference\|cycleTheme" src/studio` retorna vazio.

### 3.4 Remover o wrapper `@layer` do CSS

`studio.css` inteiro está dentro de `@layer gs.component { ... }`. **Na cascata do
CSS, regra sem camada vence qualquer regra em camada**, independente de
especificidade. Como `src/assets/css/style.css` e `variables.css` do Pulso não usam
camadas, os resets globais (`button`, `input`, `a`) passariam por cima do editor.

Em `src/assets/css/studio.css`:

- Apague a **primeira linha**: `@layer gs.component {`
- Apague a **última linha**: a `}` solta no fim do arquivo (o arquivo termina com
  duas `}` seguidas; remova só a última).

- [x] Feito. O arquivo já não abre com `@layer`.

### 3.5 Imports sem extensão nos consumidores JS

A biblioteca é TypeScript e usa o padrão TS de importar com `.js`
(`from './core/index.js'`). Entre arquivos `.ts` o Vite resolve isso sozinho. **A
partir de um `.vue` ou `.js` ele não resolve** — o import quebra em runtime.

Regra: em arquivos `.vue`/`.js`, importe **sem extensão**.

```js
import { GraphicStudioEditor } from '@/studio/editor';
import { parseGraphicStudioDocument } from '@/studio/core';
import { createSeedDocument } from '@/studio/seedDocument';
```

- [x] `EditorAlphaView.vue` e `EditorAlphaPreviewView.vue` já seguem a regra.
- [ ] Qualquer view nova que use o studio segue a mesma regra.

### 3.6 Fontes

Nada a fazer no `index.html`. O editor injeta o próprio `<link>` do Google Fonts
ao montar, com as oito famílias do catálogo (Manrope, DM Sans, Outfit, Instrument
Sans, IBM Plex Sans, Newsreader, Fraunces, IBM Plex Mono). Verificado em runtime:
`document.fonts.check('700 64px Manrope')` retorna `true`.

- [x] A tela de preview injeta o mesmo `<link>`, importando
      `googleFontsStylesheetUrl` de `@/studio/editor/catalog`. Ela abre em aba
      própria, sem o editor montado, e sem isso cairia no fallback e mostraria
      algo diferente do que seria publicado. O import é do catálogo e não do
      índice do editor, para não arrastar o editor inteiro para o chunk do
      preview.

---

## 4. Verificação

### 4.1 Já verificado no navegador

Rodado contra o dev server do Pulso, com a view montada direto (a rota exige
sessão de administrador, e a senha é sua).

- [x] `npm run build` passa. O Vite transpila `.ts` via esbuild sem checagem de
      tipos, então a biblioteca TypeScript convive com o projeto JS sem conversão.
- [x] `/admin/editor-alpha` sem sessão redireciona para
      `/login_admin?redirect=/admin/editor-alpha`. O guard está valendo.
- [x] O editor monta sem erro, com os três painéis (Inserir, canvas, Propriedades)
      e a faixa de aviso.
- [x] A barra superior já não tem o alternador de tema do studio.
- [x] Clicar num elemento seleciona e o inspetor mostra o nó (`core/heading`,
      fonte, tamanho, cor).
- [x] Arrastar move: `x` foi de 64 para 160 e `y` de 72 para 216 no documento.
- [x] `Ctrl+Z` volta para 64/72 e `Ctrl+Shift+Z` refaz para 160/216.
- [x] Botão direito abre o painel de ações, com os atalhos anotados.
- [x] Tema escuro e claro trocam a interface inteira do editor sem recarregar.
      Nenhum estilo global do Pulso vaza por cima (o `@layer` removido).
- [x] O ajuste automático de altura roda: o título nasceu com 90 px estimados e
      foi corrigido para 67 px depois de medido.
- [x] O rascunho persiste no `localStorage` sob a chave versionada.
- [x] O preview traduz o JSON como prometido: `#pagina`, `#titulo` com
      `class="titulo"` e `#apoio` com `class="texto-apoio"`, posicionados com
      `left`/`top` iguais aos do documento.

### 4.2 Falta você conferir logado

Rode `npm run dev`, entre como administrador e abra `/admin/editor-alpha`.

- [ ] O menu lateral mostra "Editor Alpha" com o selo `alpha`.
- [ ] O editor ocupa toda a área de conteúdo do admin, sem barra de rolagem na
      página inteira. Saindo da rota, as outras telas do admin voltam a rolar
      normalmente (a correção de altura é presa à classe `has-alpha-editor`).
- [ ] Alternar o tema pelo botão do admin muda o editor junto; `comfort` deixa o
      editor claro.
- [ ] A alça de rotação gira e a caixa de seleção **gira junto**, sem virar um
      retângulo maior que o objeto.
- [ ] Redimensionar um objeto girado a 45°: a alça oposta fica parada na tela.
- [ ] `Shift` trava a proporção; `Alt` redimensiona a partir do centro; `Alt` +
      arrastar duplica.
- [ ] A ferramenta Escala (`K`) aumenta o objeto **e** o `fontSize` junto; a
      ferramenta Mover (`V`) aumenta a caixa sem mexer na fonte.
- [ ] Duplo clique edita o texto no canvas, e digitar uma palavra inteira conta
      como **um** passo de histórico.
- [ ] Objeto arrastado para fora da página aparece por cima, sem ser cortado.
- [ ] O painel de camadas mostra a hierarquia em árvore e reordena frente/trás.
- [ ] O limite de passos guardados é configurável na barra superior e o contador
      (`n/limite`) acompanha.
- [ ] "Recomeçar" pede confirmação e volta ao documento inicial.
- [ ] O botão Preview abre a aba nova já logado e mostra o documento renderizado.
- [ ] Em **Baixar HTML**, o arquivo salvo abre no navegador com o desenho igual ao
      do preview, e encolhe ao estreitar a janela.
- [ ] Depois de aplicar a migração: **Salvar**, depois **Publicar**, e abrir
      `/p/<slug>` numa janela anônima. A página publicada aparece; uma que só foi
      salva como rascunho responde "não encontrada".
- [ ] Abrir o editor em duas abas, salvar na primeira e depois na segunda: a
      segunda deve recusar com aviso de versão desatualizada.
- [ ] **Versões** lista as gravações anteriores e restaura uma delas como
      rascunho.
- [ ] Arrastar um bloco perto de outro mostra a linha rosa e encosta; `Shift+1`
      enquadra o documento; `?` abre a lista de atalhos.
- [ ] Definir identificador e grupos num bloco, publicar, e conferir no HTML da
      página publicada que viraram `id` e `class`.

---

## 5. Recursos da segunda rodada

### 5.1 Baixar o HTML

A tela de preview tem **Baixar HTML**: um arquivo único que abre sozinho, sem Vue,
sem build e sem servidor.

O corpo do arquivo é o DOM que o `GraphicStudioRenderer` acabou de produzir, e não
uma segunda serialização. Uma tradução paralela divergiria do renderer a cada
mudança de schema; assim o arquivo é, por construção, o que estava na tela. O CSS
do documento (`src/assets/css/studio-render.css`) vai embutido, e as fontes entram
como link do Google Fonts.

Arquivos enviados do computador viram URLs `blob:`, válidas só na aba que as
criou. Eles não entram no arquivo baixado, e a tela avisa quantos ficaram de fora
em vez de entregar um HTML furado em silêncio. Para incluí-los, use imagens com
endereço público.

### 5.2 Encaixe em telas estreitas

O arquivo exportado reduz o documento inteiro para caber na largura disponível,
sem nunca ampliar além do tamanho original.

Geometria absoluta não reflui — é a troca aceita para ter manipulação direta como
no Figma. Então o desenho não se reorganiza: ele encolhe proporcionalmente. Isso
exige um script de seis linhas no arquivo, porque a razão entre a largura
disponível e a da prancheta é uma divisão entre comprimentos, que `calc()` não faz.
Sem JavaScript a página ainda abre, no tamanho natural e com rolagem lateral.

### 5.3 Novos tipos de bloco

Além de título, texto, link, ícone, imagem, vídeo, arquivo e bloco de cor:

- **Formas** (`core/shape`): retângulo, elipse, triângulo e linha. Um tipo só com
  um campo `kind`, porque as quatro compartilham frame, preenchimento e borda; o
  que muda é como o renderer desenha o contorno. Elipse e triângulo saem por CSS,
  não por SVG, então continuam sendo caixas comuns que aceitam filhos.
- **Lista** (`core/list`): com pontos ou números, um item por linha no inspetor.
- **Citação** (`core/quote`): texto mais autoria.
- **Incorporar** (`core/embed`): `<iframe>` para vídeo, mapa ou painel. Aceita só
  HTTPS e sai com `sandbox` e `referrerpolicy="no-referrer"` — aqui entra página
  de terceiro executando script dentro do documento.

### 5.4 Tema com cores compartilhadas

Painel **Tema** no rail esquerdo. Um token é um nome (`cor.marca`) com uma cor.
Nos campos de cor do inspetor dá para vincular o nó ao token em vez de gravar uma
cor avulsa; mudar o token muda todos os nós vinculados de uma vez.

Os tokens viram variáveis CSS (`--gs-cor-marca`) na raiz do documento, e não numa
folha de estilo, para que o HTML exportado carregue o tema junto. Editar o tema é
um comando de documento como qualquer outro, então entra no mesmo `Ctrl+Z`.

### 5.5 Animação quadro a quadro

A seção Animação do inspetor tem três modos: sem animação, animação pronta
(os cinco presets) e **quadro a quadro**.

No modo quadro a quadro você monta a linha do tempo: cada quadro tem tempo (em
por cento), opacidade, deslocamento X e Y, escala e giro. Também há duração,
atraso, aceleração, sentido e número de repetições, com zero significando "para
sempre". O botão **Prever animação** executa uma vez no canvas e volta ao estado
final; durante a edição normal o canvas fica parado, senão não dá para trabalhar.

Cada nó animado vira uma regra `@keyframes` de verdade, escrita dentro da raiz do
documento. Duas razões: o HTML exportado precisa animar sem JavaScript, e a
composição fica na GPU. Os quadros usam as propriedades individuais `translate`,
`scale` e `rotate` em vez de `transform`, para compor com a rotação do próprio nó
em vez de apagá-la.

### 5.6 Escala e caixa de seleção

- A ferramenta Escala (`K`) agora também escala os cantos arredondados. Só o lado
  de valor literal: um token aponta para o tema, e o tema não muda porque um
  objeto cresceu. Porcentagens ficam intactas, já que são relativas à caixa.
- A caixa de seleção recebe a mesma transformação do nó, incluindo `scale` e
  `skew`. Antes ela só girava, então um objeto com escala aparecia com a caixa do
  tamanho do layout, deslocada do que estava na tela.
- O arraste das alças passou a inverter a transformação inteira, e não só a
  rotação. Antes o cálculo montava e desfazia a rotação com senos e cossenos
  soltos; agora compõe uma matriz 2×2 igual à cadeia que o renderer emite e usa a
  inversa. Escala e inclinação passaram a funcionar sem caso especial.
- Medido: arrastando as oito alças, em sete combinações de rotação, escala e
  inclinação, com três deslocamentos cada, a âncora oposta se moveu no máximo
  1 px na tela — e esse pixel é o arredondamento do tamanho, visto ampliado num
  nó com escala 2.

### 5.7 Componentes reutilizáveis

No painel Inserir: **Criar da seleção** transforma o bloco selecionado no mestre
de um componente, e cada componente da lista pode gerar cópias. Editar o mestre
atualiza todas as cópias.

O modelo é deliberadamente simples: a cópia é reconstruída a partir do mestre a
cada edição. A alternativa — deixar cada cópia divergir e depois reconciliar campo
a campo — é justamente o que torna componentes imprevisíveis nas ferramentas que
fazem isso.

A cópia mantém como seu apenas a posição, o lugar na árvore, e o `name` e os
`groups`, que viram `id` e `class` no HTML e precisam ser únicos. Aparência,
tamanho e estrutura vêm do mestre.

**Texto pode ser trocado por cópia.** Editar o conteúdo de um bloco dentro de uma
cópia grava uma sobrescrita, e ela sobrevive às atualizações do mestre. É o mesmo
recorte do Figma: o que muda de cópia para cópia na prática é o texto, e deixar
tudo sobrescrevível é justamente o que torna componentes imprevisíveis. Vale para
a raiz da cópia e para qualquer bloco dentro dela.

O inspetor de uma cópia mostra dois botões: **Voltar ao original**, que descarta
as sobrescritas, e **Desvincular**, que transforma a cópia num bloco comum.
Remover o componente também não apaga as cópias: elas viram blocos comuns.

### 5.8 Checagem de tipos no build

```bash
npm run typecheck
```

Roda `tsc` sobre `src/studio` com `tsconfig.studio.json`, e agora o `npm run
build` roda a checagem antes de empacotar — erro de tipo para o build em vez de
aparecer em produção. O `typescript` entrou nas dependências de desenvolvimento,
então **rode `npm install` antes do próximo build ou deploy**.

Fica separado do `jsconfig.json` para não mudar como o editor de código trata o
resto do projeto, e cobre só os `.ts`: checar os `.vue` exigiria `vue-tsc` e
apontaria erros em todo o app, que nunca foi escrito para passar em checagem de
tipos.

### 5.8 Exportar e importar o JSON

Na faixa do editor: **Exportar JSON** baixa o documento canônico, e **Importar
JSON** carrega um de volta. É o que permite guardar um rascunho fora do
navegador, mandar para outra pessoa e continuar de onde parou.

O arquivo importado é validado antes de substituir o que está aberto, então um
arquivo estranho vira uma mensagem de erro em vez de derrubar o trabalho em
andamento. O HTML do preview é a saída final; este JSON é a fonte.

### 5.9 Publicar no servidor

Também na faixa: **Salvar**, **Publicar** e **Abrir do servidor**. Uma página
publicada fica em `/p/<slug>`, com o slug vindo do próprio documento.

- **Requer a migração** `database/migrations/2026_studio_documents.sql`. Sem ela
  as rotas respondem `503 migracao_pendente` com essa instrução, em vez de um
  erro genérico que mandaria você procurar bug no lugar errado.
- **Duas pessoas não se sobrescrevem.** O editor devolve a versão que abriu; se
  alguém gravou no meio do caminho, a resposta é `409` pedindo para abrir do
  servidor antes. Sem isso, quem salvasse por último apagaria o trabalho do outro
  em silêncio.
- **Histórico e restauração.** Cada gravação arquiva a versão anterior. O botão
  **Versões** lista as últimas 50 e restaura a escolhida. Restaurar volta como
  rascunho: voltar no tempo não deve republicar sozinho, e o estado atual também
  vai para o histórico, então dá para desfazer a restauração.
- O documento é guardado como JSONB. Normalizar em tabelas exigiria migrar o
  banco a cada campo novo de estilo, e o schema do editor muda junto com a
  interface.
- **Só o JSON é armazenado.** O HTML é sempre derivado, senão existiriam duas
  versões da mesma página podendo divergir.
- Escrever exige administrador (`requireAdmin`); ler `/api/studio/:slug` é
  público, **mas devolve apenas `status = 'publicado'`**. Rascunho não vaza.
- Exclusão é lógica (`deleted_at`), como no resto do sistema. Salvar e publicar
  são o mesmo endpoint mudando o status, para não existir a situação de publicar
  uma versão diferente da que está salva.
- O servidor valida forma, não o schema inteiro: versão, tamanho e as chaves
  estruturais. Duplicar o schema Zod do editor no backend criaria duas definições
  para divergirem; quem valida a fundo é o cliente ao abrir.
- Corpo limitado a 2 MB. Documento é texto e geometria; imagem entra por URL.

### 5.10 Testes

```bash
npm test
```

Cobrem o que quebra em silêncio e é caro de conferir a olho:

- **Geometria do arraste** — as oito alças, em sete combinações de rotação,
  escala e inclinação, com três deslocamentos cada. O teste calcula onde está o
  canto ancorado na tela antes e depois e exige que ele não se mova. Também
  cobrem shift travando proporção, alt ancorando no centro e o tamanho mínimo.
- **Escala de estilo** — o que acompanha o tamanho e o que não acompanha, os
  limites do schema, e cantos arredondados com valor literal contra token.
- **Componentes** — reconstrução a partir do mestre, posição preservada, ids
  estáveis entre passagens, `name` não copiado, e as sobrescritas de conteúdo.
- **Guias de alinhamento** — encaixe por borda e por centro, nos dois eixos, a
  escolha do alinhamento mais próximo, e os casos em que o encaixe não deve
  agir (objeto girado, tamanho mínimo).
- **Alinhar, distribuir e agrupar** — o que já existia e não tinha teste.
- **HTML exportado** — escape do título, nome de arquivo, contagem de arquivos
  efêmeros e presença do script de encaixe.

### 5.11 Identidade no HTML

Seção **Identidade no HTML** no inspetor, com dois campos e uma prévia do markup
gerado (`<h1 id="chamada" class="destaque capa">`).

Era o buraco mais sério: o schema e o renderer sempre souberam traduzir `name`
para `id` e `groups` para `class`, mas não havia como preencher nada disso pelo
editor — só editando o JSON à mão. Sem identificador e sem classe, o HTML sai
anônimo, impossível de estilizar ou referenciar de fora.

Os dois campos são validados antes de gravar, porque o schema recusaria valores
fora do padrão e a exceção cairia no meio da digitação: identificador repetido ou
fora do formato vira mensagem, não erro.

### 5.12 Título e endereço da página

O título na barra superior virou campo editável, e abaixo dele está o endereço
(`/p/<slug>`). Sem isso toda página publicada herdaria o nome do rascunho inicial
e a segunda colidiria com a primeira, já que o endereço é único.

### 5.13 Guias de alinhamento

Arrastar um objeto agora encosta nas bordas e nos centros dos vizinhos, com uma
linha rosa mostrando o alinhamento. Redimensionar também encosta, mas só a borda
puxada: a oposta é a âncora e precisa ficar parada.

O próprio container entra como referência, o que permite encostar na margem da
tela e, principalmente, centralizar — a ação mais comum e a mais chata de acertar
no olho. A tolerância é medida em pixels de tela, então a sensação é a mesma
ampliado ou reduzido.

Fica de fora quando o objeto está girado: as bordas na tela deixam de ser as do
`frame`, e a linha apontaria para o lugar errado. Com `Shift` no redimensionamento
também sai de cena, senão encostar quebraria a proporção que a tecla promete.

### 5.14 Enquadrar e atalhos visíveis

`Shift+1` enquadra o documento inteiro e `Shift+2` a seleção, com botões ao lado
do zoom. Antes, num documento maior que a janela, só restava caçar o conteúdo na
barra de rolagem.

`?` abre a lista completa de atalhos, também disponível pelo teclado na barra
superior e pelo menu do botão direito. Um editor com vinte atalhos que ninguém
descobre é um editor com zero atalhos.

### 5.15 Imagem por endereço

O painel de imagens ganhou um campo para colar um endereço HTTPS, e o inspetor
permite trocar o endereço de uma imagem já inserida. Antes só dava para usar o
acervo do Openverse, o que deixava de fora qualquer imagem já publicada no
próprio site.

### 5.16 Correção de raio no renderer

O `border-radius` de qualquer nó era apagado no navegador. O renderer emitia a
abreviação e, logo depois, as quatro longhands com valor `undefined`; o Vue traduz
`undefined` em "apague esta propriedade", e as quatro apagavam o arredondamento
inteiro. O estilo agora sai sem as chaves vazias.

---

## 6. Custo por tamanho do documento

Medido no navegador, com blocos de texto simples. O que importa é `applyCommand`,
porque ele roda a cada edição e revalida o documento inteiro duas vezes: uma na
entrada e outra na saída.

| Nós  | Validar | Um comando | Salvar (JSON) | Tamanho |
|-----:|--------:|-----------:|--------------:|--------:|
|   51 |  1,6 ms |     2,5 ms |       0,03 ms |   13 kB |
|  201 |  3,7 ms |     7,1 ms |       0,12 ms |   49 kB |
|  501 |  7,3 ms |    14,0 ms |       0,38 ms |  124 kB |
| 1000 | 14,4 ms |    28,7 ms |       0,76 ms |  247 kB |

O custo é linear. Até 500 nós cada edição custa menos que um quadro de vídeo. Em
1000 nós, digitar fica perceptivelmente pesado, porque cada tecla é um comando.

Arrastar não paga esse preço: durante o arraste o editor usa uma prévia em
memória e só grava no `pointerup`.

O schema recusa documentos acima de **1000 nós**. Uma tela cheia de conteúdo usa
algumas dezenas, então o teto está longe do uso normal — mas ele existe, e passar
dele é um erro de validação, não uma lentidão silenciosa.

---

## 7. Limites conhecidos

- **A publicação depende da migração.** Enquanto `2026_studio_documents.sql` não
  for aplicada, as rotas respondem `503` explicando isso.
- **Sem edição simultânea.** Duas pessoas na mesma página não se sobrescrevem, mas
  também não trabalham juntas: a segunda recebe conflito e precisa reabrir.
- **Sobrescrita de cópia só vale para conteúdo.** Mudar cor ou tamanho de uma
  cópia exige desvincular. É uma escolha, não uma pendência: sobrescrita de tudo é
  o que torna componentes imprevisíveis.
- **Sem responsividade real no HTML gerado.** A página encolhe para caber, mas não
  se reorganiza. É a troca aceita ao escolher geometria absoluta.
- **`typecheck` cobre só `src/studio`.** O resto do app não passa por checagem de
  tipos, e adaptá-lo seria um trabalho à parte, sem relação com o editor.

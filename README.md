# 📊 Pulso Urbano — Dados que Revelam a Cidade

[![Netlify Status](https://api.netlify.com/api/v1/badges/a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6/deploy-status)](https://app.netlify.com/sites/pulso-urbano/deploys)

**Pulso Urbano** é uma plataforma digital de dados e análises desenvolvida em parceria com o [CRISP/UFMG](https://www.crisp.ufmg.br). O objetivo é tornar acessível o conhecimento produzido em pesquisas acadêmicas sobre segurança pública, criminalidade e vitimização no Brasil.

---

## 🚀 Links do Projeto

* **Frontend:** [https://pulso-urbano.netlify.app/](https://pulso-urbano.netlify.app/)
* **Backend:** [https://pulso-urbano-backend.onrender.com/](https://pulso-urbano-backend.onrender.com/)
* **Repositório GitHub:** [https://github.com/vitimizacaocrisp/Pulso-Urbano](https://github.com/vitimizacaocrisp/Pulso-Urbano)

---

## 🎯 Objetivo

O projeto visa facilitar o acesso público aos dados e estudos produzidos pelo CRISP, utilizando ferramentas de código aberto para criar dashboards interativos e análises aprofundadas. O objetivo final é subsidiar debates públicos, projetos sociais e políticas públicas com informações claras e transparentes.

---

## ✨ Funcionalidades

* **Visualização de Análises:** Listagem dinâmica de todas as publicações, com paginação e busca em tempo real.
* **Páginas por Categoria:** Navegação por categorias específicas (Educação, Saúde, etc.), com títulos e conteúdo filtrados dinamicamente.
* **Painel Administrativo:** Área de gerenciamento de conteúdo (CRUD) para criar, editar e excluir análises.
* **Autenticação Segura:** Login para administradores com tokens JWT para proteger as rotas de gerenciamento.
* **Upload de Arquivos na Nuvem:** Suporte para upload de imagens de capa, documentos e outros anexos, com armazenamento no Backblaze B2.
* **Interface Responsiva:** Layout moderno e adaptável para desktops, tablets e celulares.

---

## 🧱 Tecnologias Utilizadas

O projeto é um monorepo com duas aplicações principais:

### **Frontend (Vue.js)**

* **Framework:** Vue 3 (com Composition API e `<script setup>`).
* **Roteamento:** Vue Router.
* **Requisições HTTP:** Axios.
* **Renderização de Markdown:** Marked.
* **Ícones:** Iconify.
* **Estilização:** CSS3 com variáveis e Less.
* **Hospedagem:** Netlify.

### **Backend (Node.js)**

* **Framework:** Express.js.
* **Banco de Dados:** PostgreSQL, hospedado na NeonDB.
* **Autenticação:** JSON Web Token (jsonwebtoken) e bcryptjs para hashing de senhas.
* **Upload de Arquivos:** Multer para manipulação e AWS-SDK v3 para upload em S3-compatível.
* **ORM/Query Builder:** `postgres.js` (`@neondatabase/serverless`).
* **Hospedagem:** Render.

### **Infraestrutura**

* **Banco de Dados:** NeonDB
* **Armazenamento de Arquivos:** Backblaze B2

---

## 🚀 Como Executar Localmente

Siga os passos abaixo para configurar e rodar o projeto no seu ambiente de desenvolvimento.

### **Pré-requisitos**

* Node.js (versão 20 ou superior)
* NPM ou Yarn

### **1. Backend**

```bash
# Navegue até a pasta do backend
cd backend

# Instale as dependências
npm install

# Crie um arquivo .env na raiz da pasta /backend e adicione as seguintes variáveis:
DATABASE_URL="<Sua_String_de_Conexão_PostgreSQL_do_NeonDB>"
B2_ENDPOINT="<Seu_Endpoint_do_Backblaze_B2>"
B2_KEY_ID="<Sua_Key_ID_do_Backblaze>"
B2_APPLICATION_KEY="<Sua_Application_Key_do_Backblaze>"
B2_BUCKET_NAME="<Nome_do_seu_Bucket_no_Backblaze>"
ADMIN_EMAIL="<Email_do_Administrador>"
ADMIN_PASSWORD_HASH="<Hash_bcrypt_da_Senha_do_Administrador>"
JWT_SECRET="<Uma_Chave_Secreta_Forte_para_JWT>"

# Inicie o servidor de desenvolvimento
npm run dev
```
O backend estará rodando em http://localhost:3000.

### **2. Frontend**

```bash
# Navegue até a pasta do frontend (em outro terminal)
cd frontend

# Instale as dependências
npm install

# Crie um arquivo .env na raiz da pasta /frontend e adicione a seguinte variável:
VUE_APP_API_URL="http://localhost:3000"

# Inicie o servidor de desenvolvimento do Vue
npm run serve
```
O frontend estará acessível em http://localhost:8080.

---

## 🗓️ Cronograma

O projeto foi planejado com atividades distribuídas entre Setembro de 2025 e Janeiro de 2026, incluindo levantamento de dados, desenvolvimento da plataforma e publicação final. 

---

## 📬 Contato

Para dúvidas, sugestões ou interesse em contribuir, entre em contato pelo e-mail:
vitimizacaocrisp1@gmail.com

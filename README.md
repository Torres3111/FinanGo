<h1 align="center">FinanGO 💵</h1>
<p align="center"> <img src="Frontend\assets\logo\Logo.png" width="200"/> </p>

<p align="center"> Plataforma  para gestão financeira pessoal, com foco em controle e na simplicidade. </p>

## 📌 Sobre o Projeto

**FinanGO** é uma aplicação fullstack desenvolvida para oferecer controle financeiro estruturado e intuitivo.  

O sistema permite gerenciamento de:

- Dashboard Financeiro
- Contas Fixas
- Parcelamentos
- Registros Diários
- Visualização de indicadores por tipo de compra
- Organização por usuário

O projeto foi construído com foco em:

- Arquitetura limpa
- Simplicidade
- Código modular e reaproveitável
- Experiência em React Native

---

## 🧠 Principais Funcionalidades

### 💰 Gestão de Gastos Diários
- Cadastro, edição e exclusão de lançamentos
- Categorias personalizadas
- Modal dinâmica para criação/edição
- Interface adaptada a tema claro/escuro

### 📅 Controle de Parcelamentos
- Cadastro de compras parceladas
- Controle de quantidade de parcelas
- Cálculo automático de valores mensais
- Persistência por usuário
- Identificação via `usuario_id + id`

### 📊 Visualização de Dados
- Total gasto por mês
- Percentual por categoria
- Estrutura preparada para gráficos

### 🎨 Tema Dinâmico
- Alternância entre modo claro e escuro
- Atualização automática das telas
- Context API para controle global de tema

---

## 🏗️ Arquitetura
FinanGO

<p>Backend</p> 
Models (SQLAlchemy) / Rotas (API) / Regras de negócio / PostgreSQL / Docker

---

<p>Frontend</p>
Telas / Componentes reutilizáveis / Context de Tema / Integração com API / AsyncStorage

---

## Tecnologias Utilizadas

### 📱 Frontend
- React Native
- Expo Router
- TypeScript

### 🖥️ Backend
- Python
- Flask
- SQLAlchemy
- PostgreSQL


# Contexto da Inteligência Artificial (AI_CONTEXT.md)

Este documento serve como um guia consolidado de arquitetura, convenções e regras do projeto **Agile Kapital**. O objetivo é que qualquer assistente de IA utilize este arquivo como contexto principal para entender o projeto rapidamente e evitar cometer erros recorrentes ou desviar da arquitetura estabelecida.

## 1. Visão Geral do Projeto
- **Nome:** Agile Kapital
- **Objetivo:** Aplicação de gestão financeira pessoal com integração Open Finance e categorização inteligente.
- **Principais Módulos:**
  - **Open Finance:** Integração com a API da *Pluggy* para importar transações e contas bancárias.
  - **Navi (IA):** Assistente virtual interna que, entre outras funções, categoriza em lote as transações obscuras (usando Groq/LLM) via endpoints na Vercel.

## 2. Stack Tecnológica
- **Frontend:** React, TypeScript, Vite, CSS puro (Flexbox/Variáveis).
- **Backend / Serverless:** Vercel Functions (`/api`), rodando Node.js.
- **Banco de Dados & Autenticação:** Firebase Cloud Firestore e Firebase Authentication. Admin SDK na Vercel.
- **Integração Externa:** Pluggy (Open Finance), Groq API (Modelos LLM para a Navi).

## 3. Estrutura de Diretórios Relevante
- `/api/` -> Funções Serverless da Vercel (onde rodam chamadas seguras, como a API da Groq e comunicação com a Pluggy).
- `/src/components/` -> Componentes React do frontend.
- `/src/services/` -> Regras de negócio, serviços isolados (ex: `navi/`, `openFinance/`).
- `/src/domain/` -> Tipagens principais e entidades do domínio (ex: `financialTransaction.ts`).

## 4. Tipagens e Regras de Negócio Importantes
O projeto possui um TypeScript rigoroso, e o build da Vercel falha se houver violações de tipo.

- **FinancialTransaction:** Toda transação normalizada deve seguir a interface `FinancialTransaction` (localizada em `src/domain/financialTransaction.ts`).
- **ClassificationSource:** As fontes válidas de classificação de uma transação são estritamente `'SYSTEM' | 'USER' | 'RULE'`. *Não utilize `'AI'` ou outras strings soltas.*
- **Tipos de Resposta:** Ao trabalhar com `fetch` e `response.json()`, cuidado com a inferência `unknown`. Faça os devidos typecasts (ex: `const data = (await response.json()) as any;`) se não houver tipagem exata.

## 5. Convenções para Vercel Functions (/api)
- Todos os endpoints devem importar e usar as tipagens `VercelRequest` e `VercelResponse` de `@vercel/node`.
- O acesso a variáveis de ambiente nos endpoints da Vercel é feito via `process.env`.
- Caso esteja em um arquivo TypeScript executado pelo Node na Vercel e o TS acuse que `process` não foi encontrado (erro TS2591), inclua `declare var process: any;` no topo do arquivo ou garanta a importação dos tipos do Node, para não quebrar o build.
- **Categorização em Lote (Navi):** Utilizamos a função `categorizeTransactionBatch` (no `naviCategorizer.ts`) para economizar tokens, não mande transações uma a uma.

## 6. Comandos Recorrentes
- `npm run build`: Executa `tsc -b && vite build`. Sempre valide este comando após criar novas tipagens ou endpoints, garantindo que a compilação local (e consequentemente na Vercel) ocorrerá com sucesso.

> **Instrução para a IA:** Ao iniciar ou retomar o desenvolvimento, consulte este arquivo para alinhar o seu raciocínio com as regras de tipagem e a arquitetura Serverless/Vite da aplicação.

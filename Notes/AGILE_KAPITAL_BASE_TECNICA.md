# 🧠 Agile Kapital - Base Técnica e Contexto da IA

> **Aviso para a IA:** Consulte este documento sempre que precisar retomar o contexto técnico do projeto. Ele contém as regras arquiteturais inegociáveis, padrões de código e diretrizes de segurança da aplicação.

---

## 1. Visão Geral
O **Agile Kapital** é um sistema de gestão financeira pessoal com integração Open Finance (via Pluggy). O objetivo central é fornecer previsibilidade, controle de metas e, futuramente, suporte inteligente através da **Navi** (Copiloto Financeiro).

## 2. Stack Tecnológico
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React.
* **Backend (Serverless):** Vercel Serverless Functions (Node.js).
* **Banco de Dados & Autenticação:** Firebase Cloud Firestore, Firebase Authentication, Firebase Admin SDK.
* **Integração Externa:** Pluggy API (Open Finance).

---

## 3. Diretrizes de Segurança e Proteção de Dados (CRÍTICO) 🔒
Trabalhamos com dados financeiros altamente sensíveis. O sistema segue a premissa de *Security by Design*:

1. **Backend Exclusivo para Segredos:** Chaves de LLM (Gemini/OpenAI), Client Secrets do Pluggy e credenciais do Firebase Admin **jamais** devem trafegar ou ser acessíveis pelo frontend.
2. **Execution Guardrails:** A Inteligência Artificial (Navi) **não possui permissão de escrita direta no banco de dados**. O LLM apenas gera *intenções* estruturadas (JSON). O *Financial Core* valida a intenção, os limites de saldo, as regras de negócio e executa a query.
3. **Filtros de Entrada/Saída:** Todo texto submetido à IA passa por validação para evitar *Prompt Injection*. Todo JSON retornado pela IA passa por validação de schema (ex: Zod) para evitar alucinações de parâmetros.
4. **Segregação por Usuário:** Todas as queries ao Firestore devem aplicar filtros rigorosos usando `userId`. As *Security Rules* do Firestore impedem acesso cruzado de contas.

---

## 4. Arquitetura e Princípios de Domínio

### O Paradigma da Navi (Copiloto)
> **O sistema calcula. A Navi interpreta. O usuário decide.**

A Navi não substitui as fórmulas matemáticas. Ela consome o contexto de uma camada determinística (Financial Core).

### Padrão de Valores Monetários
* **Regra Absoluta:** O sistema deve operar valores financeiros utilizando inteiros (centavos) para evitar erros de ponto flutuante.
* Exemplo: `R$ 10,50` é armazenado e processado como `1050` (`amountCents`).
* Funções auxiliares (como `reaisParaCentavos` e `centavosParaReais`) garantem a formatação exclusivamente na camada de exibição (UI).

### Estrutura de Diretórios e Responsabilidades
* `src/domain/`: Modelos de dados e interfaces TypeScript (`Transaction`, `Goal`, `Card`).
* `src/finance/`: *Financial Core*. Funções matemáticas determinísticas (médias, projeções, somas). Pura lógica de negócios sem dependência do React.
* `src/services/`: Integração direta com Firebase e backend Vercel.
* `src/hooks/`: Isolamento de estados React e chamadas aos `services`.
* `src/components/`: Exclusivamente UI (Tailwind CSS, radix, etc). Nenhuma regra financeira complexa deve residir aqui.
* `api/` (A construir): Rotas serverless da Vercel. Local de morada dos Agentes da Navi e do Webhook do Pluggy.

---

## 5. Roteiro de Implementação: Navi & Categorização
1. **Infraestrutura Serverless:** Configuração do ambiente `/api` no Vercel.
2. **Esqueleto de Guardrails:** Criação dos middlewares de input/output validation e semantic routing (rejeitar prompts não-financeiros).
3. **Transaction Agent (Categorizador):** Primeira versão da Navi focada em receber descrições "sujas" do Open Finance e retornar o `categoryId` e tipo mapeados.
4. **Navi V0:** Produção de Insights determinísticos (fatos isolados) na Dashboard.
5. **Navi V1/V2:** Expansão do LLM para relatórios de metas, conselhos e cenários preditivos.

---

*Documento mantido dinamicamente. Atualizar sempre que houver mudanças de paradigma arquitetural no projeto.*


## 6. Diretriz de Custos e Or�amento (CR�TICO) ??
* **Custo Zero:** O Agile Kapital opera sob a premissa estrita de N�O utilizar servi�os pagos, assinaturas de terceiros ou infraestrutura com cobran�a fixa.
* Qualquer arquitetura proposta deve obrigatoriamente se encaixar no Free Tier (Vercel Hobby, Firebase Spark, APIs gratuitas como Groq).
* A �nica exce��o de custo tolerada (quando e se decidida pelo usu�rio) � o uso do modelo Gemini PRO, embora a prioridade seja sempre usar modelos competentes gratuitos ou de cota livre.
* Solu��es que envolvam bancos de dados pagos ou plataformas SaaS tarifadas est�o **sumariamente descartadas**.


## 7. O Ciclo de Aprendizado (Feedback Loop via Chat) ??
* **Conceito:** A Navi evoluir� de um categorizador est�tico para um sistema que aprende as prefer�ncias individuais de cada usu�rio via linguagem natural.
* **Como funciona:** O usu�rio pode usar o chat para ensinar regras (ex: 'PAGTO XPTO � sa�de'). A Navi interpreta isso como uma *Inten��o de Regra* e retorna um JSON estruturado (\CREATE_RULE\).
* **Persist�ncia e Isolamento:** O backend salva essa regra no Firestore em \users/{uid}/customRules\. Na pr�xima vez que o lote de categoriza��o rodar, as regras pessoais do usu�rio s�o injetadas no contexto do LLM.
* **Benef�cio:** Personaliza��o profunda com Custo Zero, j� que a regra vive no contexto do prompt e n�o exige fine-tuning caro do modelo.

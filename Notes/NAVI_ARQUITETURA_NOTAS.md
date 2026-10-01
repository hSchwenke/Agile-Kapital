# Navi — Notas de Arquitetura e Retomada

> Documento de referência para retomar futuramente a implementação da Navi no Agile Kapital.

## 1. Objetivo

Preparar o Agile Kapital para receber a Navi como um **copiloto financeiro inteligente**, sem transformar a IA na responsável pelos cálculos financeiros do sistema.

A Navi deve interpretar dados confiáveis, explicar impactos, comparar cenários e apoiar decisões. Os números devem vir de uma camada determinística do produto.

Princípio central:

> **O sistema calcula. A Navi interpreta. O usuário decide.**

---

## 2. Estado atual do Agile

Na arquitetura atual, o Agile é essencialmente um app React/Vite conectado diretamente ao Firebase.

Responsabilidades que hoje estão no frontend:

- autenticação;
- leitura e escrita no Firestore;
- criação e exclusão de transações;
- alteração de renda;
- cálculo de receitas;
- cálculo de despesas;
- cálculo de saldo;
- agrupamento por categoria;
- cálculo de comprometimento de renda;
- construção dos gráficos.

Para a Navi, será necessário reduzir a quantidade de regras financeiras espalhadas na interface e criar uma camada central de domínio financeiro.

---

## 3. O que não fazer

Evitar uma arquitetura em que a IA recebe todo o Firestore e tenta descobrir sozinha a situação financeira do usuário.

Exemplo a evitar:

```text
Usuário
   ↓
Navi
   ↓
LLM
   ↓
Firestore inteiro
   ↓
"descubra e calcule tudo"
```

Problemas:

- cálculos não determinísticos;
- respostas inconsistentes;
- dificuldade de testes;
- maior custo e latência;
- pouca rastreabilidade;
- dificuldade de explicar de onde veio um número;
- risco de a IA inventar ou aproximar valores financeiros.

---

## 4. Direção arquitetural recomendada

A arquitetura sugerida para a evolução do Agile é:

```text
Firestore
   ↓
Financial Core
   ↓
Financial Context
   ↓
Navi Agent
```

### Financial Core

Camada 100% determinística.

Responsabilidades:

- saldo;
- receitas e despesas;
- médias;
- tendências;
- parcelamentos;
- compromissos futuros;
- projeções;
- metas;
- simulações;
- impacto de compras;
- impacto de economia;
- capacidade financeira estimada.

A IA não deve substituir esta camada.

### Financial Context

Camada responsável por montar um contexto estruturado e pequeno para a Navi.

Pode conter:

- resumo do mês;
- comparação com períodos anteriores;
- mudanças por categoria;
- parcelas futuras;
- metas ativas;
- mudança na previsão das metas;
- fatos financeiros relevantes.

Exemplo:

```json
{
  "period": "2026-09",
  "cashFlow": {
    "incomeCents": 620000,
    "expensesCents": 473000,
    "balanceCents": 147000
  },
  "categoryChanges": [
    {
      "category": "subscriptions",
      "currentCents": 25100,
      "averageCents": 16400,
      "differenceCents": 8700
    }
  ],
  "goals": [
    {
      "id": "notebook",
      "forecastDate": "2027-02-14",
      "forecastChangeDays": 14
    }
  ]
}
```

### Navi Agent

Responsabilidades:

- interpretar fatos;
- decidir o que vale investigar;
- priorizar informações;
- explicar causa e efeito;
- responder perguntas;
- recomendar ações;
- comparar cenários;
- decidir se algo é relevante o suficiente para comunicar.

A Navi pode raciocinar sobre os dados, mas não deve ser a autoridade sobre os números.

---

## 5. Agentes no lugar do Insight Engine

Uma evolução possível é não criar um Insight Engine rígido baseado apenas em regras.

Em vez de:

```text
Financial Engine
       ↓
Insight Engine
       ↓
Navi
```

usar:

```text
Financial Core
       ↓
Financial Context
       ↓
Navi Agent
```

O agente recebe fatos calculados e decide:

- o que mudou;
- o que é relevante;
- qual meta foi afetada;
- se vale notificar;
- qual explicação é mais útil.

Isso evita uma explosão futura de regras como:

```text
categoria aumentou
categoria caiu
renda caiu
renda aumentou
meta atrasou
meta antecipou
parcelas futuras altas
saldo baixo
compra incomum
aporte abaixo da média
aporte acima da média
```

O agente pode combinar sinais sem exigir dezenas de `if/else`.

---

## 6. Regra inegociável para agentes

> **Agentes podem decidir o que investigar e como interpretar. O Financial Core continua sendo a autoridade sobre números.**

Exemplo correto:

```text
Navi Agent
   ↓
getCategoryAverage()
   ↓
Financial Core
   ↓
R$ 164
```

Depois:

```text
Navi Agent
   ↓
simulateGoalImpact()
   ↓
Financial Core
   ↓
+14 dias
```

A Navi apenas conecta os fatos e explica.

---

## 7. Tools da Navi

A Navi não deve ter acesso arbitrário ao Firestore.

Ela deve usar ferramentas controladas.

Possíveis tools:

```text
getMonthlySummary()
getCategoryAnalysis()
getCategoryAverage()
getCategoryTrend()
getFutureInstallments()
getGoalStatus()
getGoalForecast()
simulatePurchaseImpact()
simulateSavingsImpact()
calculateRequiredContribution()
```

Futuramente:

```text
createTransaction()
createInstallmentPurchase()
createGoalContribution()
```

Toda tool de escrita deve passar por validação e por serviços de domínio.

Arquitetura correta:

```text
Agent
  ↓
Tool
  ↓
Service
  ↓
Validation
  ↓
Firestore
```

Evitar:

```text
Agent
  ↓
Firestore direto
```

---

## 8. Possível arquitetura multiagente futura

Não é necessário começar com vários agentes.

A primeira versão pode ter apenas um:

```text
Navi Agent
   │
   ├── Financial Tools
   ├── Goal Tools
   └── Transaction Tools
```

Se a complexidade crescer, evoluir para:

```text
                 Navi Orchestrator
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
 Finance Analyst    Goal Planner   Transaction Agent
      Agent             Agent            Agent
```

### Finance Analyst Agent

Responsável por analisar:

- comportamento financeiro;
- mudanças de categoria;
- tendências;
- renda;
- saldo;
- compromissos futuros;
- fatos relevantes.

### Goal Planner Agent

Responsável por:

- analisar metas;
- comparar ritmo atual e necessário;
- testar cenários;
- calcular necessidade de aporte via tools;
- sugerir caminhos possíveis.

### Transaction Agent

Responsável por interpretar linguagem natural.

Exemplo:

> Comprei um tênis de R$ 600 em 3x.

Saída estruturada:

```json
{
  "type": "expense",
  "description": "Tênis",
  "amountCents": 60000,
  "installments": 3,
  "category": "compras"
}
```

Depois uma tool determinística cria as parcelas.

Este agente poderá ser reutilizado pelo:

- site;
- Navi;
- WhatsApp;
- voz, futuramente.

---

## 9. Backend

Para a Navi, o Agile precisará de uma camada de backend mais forte.

Sugestão inicial:

- Firebase Cloud Functions 2nd gen;
- autenticação via Firebase Auth;
- validação de payload;
- App Check;
- regras de Firestore;
- segredos apenas no backend.

Nunca colocar chave de LLM no frontend.

Errado:

```text
React
  ↓
LLM API
```

Correto:

```text
React
  ↓
Cloud Function
  ↓
LLM API
```

---

## 10. Domínio financeiro

Retirar os principais tipos financeiros de componentes React.

Estrutura possível:

```text
shared/
  domain/
    transaction.ts
    installment.ts
    goal.ts
    income.ts
    category.ts

  finance/
    money.ts
    competence.ts
```

A interface React deve consumir regras financeiras, não ser dona delas.

Regra recomendada para o projeto:

> **A interface nunca deve implementar uma regra financeira que possa ser reutilizada por outra interface.**

---

## 11. Valores monetários

Preparar o sistema para trabalhar com centavos inteiros.

Exemplo:

```text
R$ 10,00 → 1000
R$ 87,43 → 8743
R$ 600,00 → 60000
```

Campo sugerido:

```text
amountCents
```

Isso evita problemas de ponto flutuante e simplifica parcelamentos.

Exemplo:

```text
R$ 100 em 3x

3333
3333
3334
```

A soma continua exatamente igual a 10000 centavos.

---

## 12. Modelo de transação preparado para a Navi

Exemplo conceitual:

```text
Transaction {
  id
  userId
  type
  description
  amountCents
  categoryId
  transactionDate
  competence
  source
  installment?
  createdAt
  updatedAt
}
```

Possíveis valores de `source`:

```text
web
whatsapp
navi
import
system
```

Para parcelamento:

```text
installment: {
  groupId
  current
  total
  originalAmountCents
}
```

Não depender de textos como `Tênis 2/3` para descobrir que uma transação é parcelada.

A informação precisa ser estruturada.

---

## 13. Metas

As metas serão um dos componentes mais importantes para a Navi.

Sem metas, a Navi tende a produzir análises genéricas.

Com metas, pode explicar impacto em objetivos reais.

Separar:

```text
targetDate
```

prazo desejado pelo usuário.

E:

```text
forecastDate
```

previsão calculada pelo sistema.

Possível modelo:

```text
Goal {
  id
  userId
  name
  targetAmountCents
  currentAmountCents
  createdAt
  targetDate
  forecastDate
  status
  forecastVersion
}
```

---

## 14. Snapshots financeiros

Para evitar recalcular toda a vida financeira do usuário a cada pergunta, considerar snapshots mensais.

Exemplo:

```text
users/{uid}/monthlySnapshots/2026-09
```

Possível conteúdo:

```json
{
  "incomeCents": 620000,
  "expenseCents": 473000,
  "availableCents": 147000,
  "categories": {
    "alimentacao": 83000,
    "assinaturas": 25100,
    "compras": 42000
  },
  "futureInstallmentsCents": 90000
}
```

Isso facilita análises de:

- mês atual;
- mês anterior;
- últimos 3 meses;
- últimos 6 meses;
- últimos 12 meses.

---

## 15. Versionamento

Versionar o motor financeiro.

Exemplo:

```text
financialEngineVersion = "1.0.0"
```

Isso ajuda a reproduzir previsões antigas quando fórmulas mudarem.

Também considerar versionamento do contexto e da camada de agentes.

---

## 16. Observabilidade

Registrar de onde veio cada insight ou resposta importante.

Possível estrutura:

```text
NaviInsight {
  id
  userId
  type
  generatedAt
  facts
  financialEngineVersion
  agentVersion
  status
}
```

Objetivo:

Se o usuário perguntar por que a Navi afirmou algo, o sistema deve conseguir reconstruir:

- quais dados foram usados;
- quais cálculos foram feitos;
- qual versão do motor produziu os números;
- qual contexto foi enviado ao agente.

---

## 17. Testes

O Financial Core deve ter testes fortes.

Camadas sugeridas:

```text
Unit Tests
    ↓
Financial Core

Integration Tests
    ↓
Services + Firestore

Scenario Tests
    ↓
Navi Agent
```

Casos essenciais:

- divisão de parcelas;
- arredondamento;
- soma mensal;
- médias por categoria;
- metas;
- impacto de novas compras;
- impacto de redução de gastos;
- mudança de previsão;
- compromissos futuros.

---

## 18. Navi por versões

### Navi V0 — sem IA

O sistema produz fatos e insights determinísticos.

Exemplos:

```text
Assinaturas aumentaram 32%
Meta Notebook atrasou 8 dias
Gastos diminuíram R$ 300
```

Objetivo: validar a qualidade dos dados.

### Navi V1 — IA como redatora/intérprete

Entrada:

```text
fatos estruturados
```

Saída:

```text
mensagem natural
```

Sem ações autônomas.

### Navi V2 — conversa

Usuário pode perguntar:

> Por que minha meta atrasou?

A Navi consulta tools e responde.

### Navi V3 — copiloto

Permite perguntas de cenário:

> E se eu economizar R$ 100 por mês?

> Posso comprar um celular de R$ 2.400 em 6x sem comprometer minha viagem?

A Navi usa simulações do Financial Core.

---

## 19. A Navi pode começar sem chat

A primeira experiência de Navi pode ser um card no dashboard.

Exemplo:

```text
✦ Navi

Suas despesas estão R$ 240 abaixo da média deste período.

Se você direcionar essa diferença para a meta Notebook,
a previsão pode ser antecipada.
```

Isso permite validar a utilidade da Navi antes de construir uma interface conversacional completa.

---

## 20. WhatsApp

Se a arquitetura for construída corretamente, o WhatsApp será apenas outro canal de entrada.

```text
                     ┌── Web
                     │
Transaction Service ─┼── WhatsApp
                     │
                     └── Navi
```

O mesmo backend deve ser responsável por:

- criar transações;
- criar parcelas;
- validar dados;
- recalcular contexto;
- atualizar metas;
- alimentar a Navi.

Evitar implementar regras separadas para cada canal.

---

## 21. Roadmap sugerido

```text
Fase 0  — Refatorar domínio
Fase 1  — Money em centavos + modelos
Fase 2  — Categorias Compras / Assinaturas
Fase 3  — Backend / Cloud Functions
Fase 4  — Parcelamento
Fase 5  — Metas
Fase 6  — Financial Core
Fase 7  — Snapshots / histórico
Fase 8  — Financial Context
Fase 9  — Navi V0
Fase 10 — Navi Agent V1
Fase 11 — Conversa + tools
Fase 12 — WhatsApp
```

---

## 22. Estrutura de código possível

```text
Agile-Kapital/

src/
  app/
  components/
  pages/
  hooks/
  services/
    firebase/

shared/
  domain/
    transaction.ts
    installment.ts
    goal.ts
    income.ts

  finance/
    money.ts
    competence.ts

functions/
  src/

    commands/
      createTransaction.ts
      createInstallmentPurchase.ts
      createGoal.ts

    services/
      transactionService.ts
      goalService.ts

    finance/
      calculateMonthlySummary.ts
      calculateCategoryAverage.ts
      calculateGoalForecast.ts
      calculatePurchaseImpact.ts

    context/
      buildFinancialContext.ts

    navi/
      orchestrator.ts
      tools.ts
      prompts.ts

    triggers/
      onTransactionCreated.ts
      onTransactionUpdated.ts
      onTransactionDeleted.ts
```

---

## 23. Decisões atuais

Decisões que parecem mais adequadas neste momento:

1. Não implementar a Navi antes de consolidar o domínio financeiro.
2. Manter cálculos financeiros determinísticos.
3. Permitir que agentes façam análise, priorização e interpretação.
4. Não dar acesso direto dos agentes ao Firestore.
5. Criar tools com contratos claros.
6. Começar com um único Navi Agent.
7. Só dividir em múltiplos agentes quando houver necessidade real.
8. Considerar substituir um Insight Engine rígido por análise feita pelo agente sobre fatos estruturados.
9. Preparar o backend para que Web, Navi e WhatsApp usem a mesma lógica.
10. Fazer o dashboard usar o mesmo Financial Core que futuramente alimentará a Navi.

---

## 24. Questões a decidir futuramente

Ainda precisam de definição:

- fórmula oficial de capacidade de aporte;
- diferença entre saldo disponível e valor recomendável para aporte;
- tratamento de renda recorrente vs. eventual;
- estratégia de previsão de metas;
- quantidade de histórico usada para médias;
- critérios para considerar algo relevante;
- quando a Navi deve ser proativa;
- como evitar repetição de insights;
- limites de autonomia da Navi;
- quando exigir confirmação antes de executar ações;
- estratégia de memória/contexto conversacional;
- retenção dos dados enviados ao provedor de IA;
- observabilidade e auditoria das respostas.

---

## 25. Definição de produto da Navi

Definição sugerida:

> **A Navi é uma camada de interpretação, raciocínio e interação sobre um sistema determinístico de inteligência financeira do Agile Kapital.**

Ela não é:

- o banco de dados;
- o motor matemático;
- uma calculadora probabilística;
- um chatbot genérico.

Ela é a camada que conecta:

```text
dados
  ↓
fatos financeiros
  ↓
contexto
  ↓
decisão
```

Objetivo final:

> **Transformar dados financeiros em decisões simples.**

---

## 26. Ponto recomendado para retomada

Quando este trabalho for retomado, não começar pela integração com um LLM.

Começar por:

1. revisar os modelos atuais de dados;
2. separar tipos de domínio da interface;
3. criar módulo de dinheiro em centavos;
4. centralizar cálculos atuais em um Financial Core;
5. criar testes desses cálculos;
6. estruturar o backend;
7. depois avançar para parcelas, metas e contexto financeiro;
8. somente então conectar a primeira versão da Navi.

Este documento deve ser tratado como uma nota de arquitetura, não como especificação final. As decisões podem evoluir conforme o produto e os dados reais do Agile amadurecerem.

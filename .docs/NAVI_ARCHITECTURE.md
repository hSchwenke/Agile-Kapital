# Arquitetura e Orquestração da Navi (Copiloto)

A **Navi** é a guia financeira ("Hey, listen!") do Agile Kapital. Ela não é um chatbot genérico, mas sim o coração da aplicação, atuando de forma ativa para guiar, proteger e organizar a vida financeira do usuário de maneira minimalista e inteligente.

## 1. Presença no Frontend (UI/UX)
Para manter o aplicativo *clean* e não poluir a interface, a Navi se manifesta de duas formas:
- **Insights Proativos (Cards de Alerta):** Componentes discretos no topo do Dashboard que só aparecem se houver algo crítico (ex: "Sua assinatura da Netflix aumentou").
- **Portal da Navi (Command Center):** Um campo de busca/chat para requisições em linguagem natural ("Crie uma meta de R$ 5.000 para viagem" ou "Quanto gastei de iFood?").

## 2. A Mente da Navi (Arquitetura Backend)
A Navi não advinha respostas; ela acessa a infraestrutura do aplicativo através de **Function Calling / Tools**:
- Quando o usuário pergunta algo, o LLM (Groq) interpreta a intenção e executa ferramentas internas.
- Exemplo: Ao invés de chutar um valor, ela aciona `buscarTransacoes(categoria: 'alimentacao')` no Firestore, analisa os dados reais e devolve uma resposta perfeitamente precisa.

## 3. O Treinamento (Banco de Memória)
A evolução e a "inteligência" da Navi funcionam com base em um sistema de contexto dinâmico (Feedback Loop), sem a necessidade de re-treinar o modelo-base:
1. **Regras Pessoais (Memória Longa):** A Navi salva preferências do usuário no Firestore (coleção `navi_memory`). Se o usuário diz "Toda compra na farmácia XYZ é despesa dos meus pais", a Navi armazena essa regra e a injeta no contexto das próximas análises.
2. **Reconhecimento de Padrões:** Conforme o histórico cresce (meses de uso via Pluggy), a Navi calcula médias móveis e limites de segurança. É assim que ela engatilha os avisos proativos antes do orçamento estourar.
3. **Ciclo de Correção:** Quando a Navi classifica algo erroneamente e o usuário corrige manualmente no aplicativo, o sistema registra essa correção (`ClassificationSource: USER`). Nas categorizações futuras, a Navi usa as correções passadas como gabarito (Few-Shot Prompting).

> **Objetivo Final:** Transformar o Agile Kapital em um Sistema Operacional Financeiro guiado por inteligência, onde tabelas e gráficos são apoios visuais, e a Navi faz todo o trabalho duro e preditivo.

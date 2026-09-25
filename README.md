# Controle Financeiro Pessoal

O Agile Kapital é uma aplicação de gestão financeira pessoal desenvolvida para centralizar informações financeiras, organizar contas, acompanhar movimentações e evoluir gradualmente para uma experiência integrada com Open Finance.

# Funcionalidades

* **Dashboard Financeiro:** visão consolidada de receitas, despesas, saldo, cartões e demais informações relevantes para acompanhamento financeiro.
* **Atualização Automática de Indicadores:** os principais valores e totais da aplicação são recalculados conforme novas movimentações são registradas.
* **Indicadores Visuais:** componentes da interface destacam situações que exigem atenção e facilitam a leitura do cenário financeiro.
* **Layout Responsivo:** interface adaptada para uso em desktop e dispositivos móveis.
* **Autenticação de Usuários:** acesso individual por meio do Firebase Authentication.
* **Persistência em Nuvem:** dados armazenados no Firestore, com segregação por usuário e persistência entre sessões.
* **Extrato Financeiro:** consulta organizada das movimentações registradas na aplicação.
* **Integração com Open Finance:** desenvolvimento da conexão com Pluggy e Meu Pluggy para leitura de contas e, posteriormente, transações bancárias autorizadas pelo usuário.
* **Backend Server-Side:** rotas executadas na Vercel para autenticação, integração com serviços externos e tratamento de operações que não devem ser executadas no navegador.
* **Controle de Acesso:** associações de Open Finance e dados financeiros são vinculados ao usuário autenticado, com validações realizadas no backend.
* **Arquitetura Financeira Evolutiva:** base preparada para normalização, sincronização, deduplicação de transações e integração futura com o Financial Core e a Navi.
* **Navi:** futura assistente virtual do Agile Kapital, que atuará como copiloto do usuário, auxiliando na projeção de custos, acompanhamento de metas e interpretação do contexto financeiro.


# Tecnologias Utilizadas

- React
- TypeScript
- Vite
- Firebase Authentication
- Cloud Firestore
- Firebase Admin SDK
- Vercel — hospedagem e funções server-side
- Pluggy — integração com Open Finance
- CSS3 (Flexbox, Media Queries e Variáveis CSS)

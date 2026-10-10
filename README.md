# TaskFlow — Aplicação Web de Gerenciamento de Tarefas

O **TaskFlow** é uma aplicação web moderna e minimalista de gerenciamento de tarefas e projetos, inspirada em suítes de produtividade de alto padrão. O sistema foi desenvolvido com foco em clareza, desempenho e uma experiência visual calma (estilo SaaS com toques neo-táteis), utilizando exclusivamente tecnologias nativas da Web.

---

## 🎨 Identidade Visual & Design System

A interface é construída sobre um sistema de design rigoroso:
- **Paleta de Cores SaaS:** Fundo neutro em tom ardósia (`#F8FAFC`), superfícies elevadas brancas com bordas sutis (`1px solid #E2E8F0`), azul índigo elétrico para ações principais (`#4F46E5`), esmeralda puro para conclusões (`#10B981`) e rosa/âmbar para prioridades críticas e alertas.
- **Tipografia:** Tipografia limpa utilizando a fonte **Plus Jakarta Sans** com espaçamento de letras refinado para máxima legibilidade.
- **Componentes Neo-Táteis:** Checkboxes circulares com animações suaves de conclusão, chips de prioridade coloridos e cartões com sombras difusas de baixa opacidade.

---

## 📂 Estrutura do Projeto

A aplicação segue uma arquitetura estritamente modular baseada em ES Modules nativos:

```text
taskflow/
├── index.html
├── css/
│   ├── style.css
│   ├── layout.css
│   ├── components.css
│   └── responsive.css
└── js/
    ├── app.js
    ├── tasks.js
    ├── projects.js
    ├── storage.js
    ├── productivity.js
    └── ui.js
```

### Responsabilidades dos Arquivos
- **index.html**: Estrutura semântica principal e layout responsivo com suporte a drawer móvel.
- **style.css**: Definição global de variáveis CSS, tokens do Design System, tipografia e reset básico.
- **layout.css**: Estrutura do grid, menu lateral colapsável, cabeçalhos e painéis.
- **components.css**: Estilização de botões, cartões de tarefas, modais, chips, pílulas de prioridade e formulários.
- **responsive.css**: Media queries otimizadas para transição fluida entre dispositivos móveis (< 768px), tablets e desktops.
- **app.js**: Ponto de entrada que inicializa a aplicação e integra todos os módulos.
- **tasks.js**: Lógica de CRUD para tarefas, filtros combinados, busca em tempo real e ordenação.
- **projects.js**: Gerenciamento de projetos personalizados, atribuição de cores e regras de exclusão segura.
- **storage.js**: Camada de persistência em `LocalStorage` com versionamento de esquema e dados demo iniciais.
- **productivity.js**: Algoritmos de cálculo para taxa de conclusão, tarefas vencidas e histórico dos últimos 7 dias.
- **ui.js**: Manipulação reativa do DOM, renderização de visualizações (Inbox, Hoje, Próximos dias, Projetos) e gerenciamento de modais.

---

## 🚀 Como Executar o Projeto

Como a aplicação utiliza exclusivamente **HTML5, CSS3 e JavaScript puro (Vanilla JS)** via módulos nativos, **não é necessário instalar Node.js, npm ou qualquer ferramenta de build**.

1. Clone ou baixe este repositório para o seu computador.
2. Certifique-se de que todos os arquivos estejam organizados na estrutura de pastas indicada acima.
3. Para evitar restrições de segurança do navegador (`CORS policy`) ao carregar módulos JavaScript locais (`type="module"`), abra o projeto utilizando um servidor local simples:
   - **Visual Studio Code:** Instale a extensão **Live Server** e clique em *Go Live* no arquivo `index.html`.
   - **Python:** Execute o comando `python -m http.server` na raiz do projeto e acesse `http://localhost:8000`.
   - **Node.js (Opcional apenas para servidor):** Execute `npx serve` na pasta do projeto.

---

## ✨ Principais Funcionalidades

- **Gerenciamento Completo de Tarefas:** Crie, edite, conclua ou exclua tarefas informando título, descrição opcional, projeto vinculado, data de vencimento e nível de prioridade.
- **Hierarquia de Prioridades:** 
  - *Prioridade 1 (Urgente):* Rose Red (`#E11D48`) com indicador de bandeira.
  - *Prioridade 2 (Alta):* Amber (`#D97706`).
  - *Prioridade 3 (Média):* Slate / Blue (`#64748B`).
  - *Prioridade 4 (Normal):* Cinza neutro.
- **Visualizações Dinâmicas:** Alterne instantaneamente entre *Caixa de entrada*, *Hoje*, *Próximos dias*, *Todas as tarefas*, projetos específicos e o *Painel de produtividade*.
- **Painel de Produtividade Integrado:** Visualize métricas em tempo real (total, pendentes, concluídas, concluídas hoje e vencidas), taxa de conclusão e gráficos de entregas dos últimos 7 dias renderizados nativamente via SVG/CSS.
- **Persistência Local Automática:** Todos os dados são salvos instantaneamente no `LocalStorage` do navegador, com inclusão de dados de demonstração na primeira execução.
- **Design 100% Responsivo:** Adaptado para proporcionar uma experiência fluida em computadores, notebooks, tablets e smartphones (com menu lateral em formato *drawer* e barra de navegação inferior móvel).

---

## 🛠️ Licença
Este projeto é de uso livre para fins educacionais, de portfólio e produtividade pessoal.
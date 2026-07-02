# 05 · Critérios de Aceite

Critérios objetivos, testáveis, por entrega. Servem de checklist de "pronto" pra cada fase do
backlog (`06-backlog-fases.md`).

## Módulo de Tarefas (núcleo desta rodada)

- [ ] Toda tarefa tem `chassi` obrigatório — não é possível criar tarefa sem veículo vinculado.
- [ ] Tentar mudar `status` de uma tarefa para `em_andamento` sem `responsavel_id` é bloqueado
      com mensagem clara (R5).
- [ ] Tentar mudar `status` para `bloqueada` sem `motivo_bloqueio` é bloqueado (R7).
- [ ] Toda mudança de `status`, `responsavel_id`, `prazo` ou `valor` de uma tarefa gera uma
      linha nova em `tarefa_historico` — nunca sobrescreve (R8).
- [ ] É possível anexar documento, imagem e áudio a uma tarefa, e a lista de anexos aparece na
      tela do veículo (aba Anexos) sem precisar abrir a tarefa individualmente.
- [ ] Checklist de uma tarefa mostra % de conclusão e cada item pode ser marcado
      independentemente.
- [ ] Um veículo em `06_qualidade` com pelo menos uma tarefa bloqueante em aberto **não pode**
      avançar para `07_liberado` — a UI mostra quais tarefas estão travando (R6).
- [ ] Um veículo com todas as tarefas bloqueantes concluídas avança normalmente de 06 para 07.
- [ ] `SUM(tarefa.valor)` por chassi aparece corretamente no card de Faturamento da tela do
      veículo e no relatório de custo de preparação.

## Tela do Veículo (mini-ambiente)

- [ ] As 6 abas (Visão Geral, Tarefas, Movimentação, Agenda, Histórico, Anexos) carregam sem
      erro para qualquer chassi real do dataset importado (1.642 veículos).
- [ ] A aba Histórico mostra eventos de `status_historico` e `tarefa_historico` intercalados
      por ordem cronológica, não em duas listas separadas.
- [ ] O cabeçalho fixo (chassi, modelo, status) permanece visível ao rolar a página em
      qualquer aba.

## Dashboard Geral

- [ ] Todos os 14 KPIs listados em `04-telas-mvp.md` seção 1 calculam a partir dos dados reais
      importados, sem placeholder/mock.
- [ ] Filtro por vendedor, local, status, cliente, modelo, data de faturamento, previsão de
      entrega e responsável funciona simultaneamente (combinação AND).
- [ ] A lista de "alertas críticos" nunca ultrapassa 20 itens visíveis sem paginação/scroll
      próprio (lição do `Red Team` do sistema de referência: hub/lista sem limite fica
      ilegível).

## Telas novas (Faturamento, Agenda de Acessórios, Entregues, Cadastros, Relatórios)

- [ ] Cada tela nova carrega os dados reais já importados (não precisa de novo CSV pra
      validar) — ex.: Agenda de Acessórios mostra as 31 linhas reais já no `real-seed.json`.
- [ ] Cadastros de Apoio permite editar nome de vendedor/local/implemento e ver os aliases
      (duplicatas mescladas) sem quebrar os vínculos existentes com veículos.
- [ ] Relatórios exportam CSV com os dados filtrados na tela (não o dataset inteiro
      ignorando filtro).

## Regras herdadas (R1-R4, não podem regredir)

- [ ] R1: ainda é impossível sair de `01_aguardando_faturamento` sem NF e data de faturamento.
- [ ] R2: ainda é impossível avançar etapa do veículo sem responsável.
- [ ] R3: reprovação em Qualidade ainda exige motivo e volta pra Preparação.
- [ ] R4: histórico de status do veículo continua append-only.

## Performance e volume

- [ ] Lista de 1.642 veículos carrega e filtra em menos de 1s no ambiente local (já validado
      no MVP v1 — não pode regredir com a adição das abas/tarefas).
- [ ] Kanban de Tarefas com volume real (estimativa: 1 a 3 tarefas por veículo em preparação,
      ~600-1800 tarefas) não trava o drag-and-drop — aplicar o mesmo limite de cards visíveis
      por coluna já usado no Kanban do Pipeline (`CARDS_PER_COLUMN`, ver
      `app/src/components/KanbanBoard.tsx`).

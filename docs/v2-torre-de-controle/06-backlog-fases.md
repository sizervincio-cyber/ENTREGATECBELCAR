# 06 · Backlog por Fase

Ordem de desenvolvimento pensada como o Blue Team do sistema de referência pensou a dele:
entregar o "mínimo mágico" primeiro (o que muda a percepção de valor mais rápido), deixar
polimento e telas administrativas por último.

## Fase A — Fundação de dados do módulo de Tarefas

- Rodar o DDL delta de `02-modelo-dados.md` (`tarefa`, `tarefa_checklist_item`, `tarefa_anexo`,
  `tarefa_comentario`, `tarefa_historico`) em cima do `db/schema.sql` já existente.
- Estender `app/src/types/domain.ts` com os novos tipos (`Tarefa`, `TarefaChecklistItem`,
  `TarefaAnexo`, `TarefaComentario`, `TarefaHistorico`).
- Estender `app/src/data/store.ts` com as novas funções (`listTarefas`, `createTarefa`,
  `updateTarefaStatus`, `addChecklistItem`, `toggleChecklistItem`, `addAnexo`, `addComentario`)
  seguindo o mesmo padrão async + append-only já usado pra `advanceStatus`.
- Seed de tarefas: gerar tarefas reais a partir do que já existe nos dados importados —
  toda linha de `agenda_acessorios` vira uma tarefa `acessorio` com `valor` copiado; todo
  veículo com `recall_status IN (tem, em_servico)` ganha uma tarefa `recall`; todo veículo em
  `05_em_preparacao` ganha uma tarefa `lavagem` (ver regra de tarefas automáticas,
  `02-modelo-dados.md`).

## Fase B — Kanban e Drawer de Tarefas (o "mínimo mágico")

- Tela `/tarefas`: Kanban + Lista, filtros, agrupamento por urgência.
- `TarefaDrawer`: checklist, anexos (upload documento/imagem/áudio), comentários, histórico.
- `CreateTarefaModal`: criar tarefa vinculada a um chassi.
- Implementar R5 (responsável obrigatório pra `em_andamento`) e R7 (motivo obrigatório pra
  `bloqueada`) como validação client-side + trigger no schema quando for pra Supabase real.

## Fase C — Tela do Veículo como mini-ambiente

- Redesenhar `/veiculos/:chassi` com as 6 abas (Visão Geral, Tarefas, Movimentação, Agenda,
  Histórico, Anexos).
- Implementar R6 (gate de qualidade por tarefas bloqueantes) na ação de avançar de 06 para 07.
- Timeline consolidada (Histórico) juntando `status_historico` + `tarefa_historico`.

## Fase D — Dashboard Geral expandido

- 14 KPIs (ver `04-telas-mvp.md`), com filtros combinados.
- Lista de alertas críticos com limite de itens visíveis.

## Fase E — Telas que faltam

- Faturamento (`/faturamento`).
- Agenda de Acessórios (`/agenda-acessorios`) — dado já existe, só falta tela.
- Histórico de Entregues (`/entregues`).
- Cadastros de Apoio (`/cadastros`) — CRUD sobre vendedor/local/implemento/motivo_reprovacao.

## Fase F — Relatórios e polish visual

- 3 relatórios fixos + exportação CSV.
- Redesenho visual completo seguindo `02b-design-system.md` (paleta, sidebar, topbar, KPI
  cards, badges) em todas as telas — hoje o MVP v1 já usa uma paleta e componentes próprios;
  esta fase é sobre elevar a um padrão mais próximo do sistema de referência (mais denso,
  mais executivo).
- Skeleton screens, empty states revisados, confirmação de saída com dados não salvos.

## Fora do MVP desta rodada (proposital, análogo ao Red Team do sistema de referência)

| Feature | Por que fica fora |
|---|---|
| Autenticação real + RLS por papel | MVP continua sem login, mock local. Auth é rodada separada (schema já tem RLS pronto pra "authenticated", falta o login em si) |
| Notificações por e-mail/push | Precisa infra de envio — fora de escopo de front-only |
| App mobile pro produtivo marcar tarefa | V2, depende de definição de fluxo de evidência obrigatória (foto) |
| Tarefas automáticas geradas por regra (seção do modelo de dados) | Fica como proposta — precisa validação do time de operação antes de ativar automaticamente (ver perguntas de negócio) |
| Builder de relatório customizado | 3 relatórios fixos resolvem o essencial; builder é V2 |
| Importação incremental (fluxo contínuo em vez de carga única) | Depende de decidir se a fonte de verdade migra da planilha pro sistema — pergunta de negócio maior, não é decisão técnica |

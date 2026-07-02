# 09 · Plano de Implementação em Fases

Consolida `06-backlog-fases.md` em um plano executável, com entregáveis concretos por fase e
critério de "pronto pra próxima fase" (subset de `05-criterios-aceite.md`). **Nenhum código foi
gerado ainda** — este plano é o que será executado mediante aprovação, uma fase de cada vez,
com checkpoint de revisão entre fases (mesmo padrão de entrega já usado nas rodadas anteriores
deste projeto).

## Fase A — Fundação de dados (schema + tipos + store)

**Entregáveis:**
- `db/schema-v2-tarefas.sql` com o DDL delta completo de `02-modelo-dados.md`.
- `app/src/types/domain.ts` estendido com `Tarefa`, `TarefaChecklistItem`, `TarefaAnexo`,
  `TarefaComentario`, `TarefaHistorico` + enums (`TarefaCategoria`, `TarefaStatus`,
  `TarefaPrioridade`).
- `app/src/data/store.ts` estendido com as funções de leitura/escrita de tarefas.
- `app/src/lib/rules.ts` estendido com R5-R8.
- Seed de tarefas geradas a partir do dataset real já importado (acessórios, recall).

**Pronto pra Fase B quando:** `npm run build` passa, e uma tarefa de teste pode ser criada,
movida entre status e ter seu histórico consultado via console/store diretamente (sem UI
ainda).

## Fase B — Kanban e Drawer de Tarefas

**Entregáveis:**
- `/tarefas`: Kanban (colunas por `tarefa_status`) + Lista, com toggle.
- `TarefaDrawer.tsx`: checklist, anexos, comentários, histórico.
- `CreateTarefaModal.tsx`: criação vinculada a chassi.
- Validações R5/R7 visíveis na UI (mensagem de erro clara, não só bloqueio silencioso).

**Pronto pra Fase C quando:** critérios de aceite da seção "Módulo de Tarefas" em
`05-criterios-aceite.md` passam.

## Fase C — Tela do Veículo como mini-ambiente

**Entregáveis:**
- Redesenho de `/veiculos/:chassi` com 6 abas.
- Gate R6 implementado na ação de avançar 06→07.
- Timeline consolidada na aba Histórico.

**Pronto pra Fase D quando:** critérios de aceite da seção "Tela do Veículo" passam.

## Fase D — Dashboard Geral expandido

**Entregáveis:**
- 14 KPIs + filtros combinados + lista de alertas críticos limitada.

**Pronto pra Fase E quando:** critérios de aceite da seção "Dashboard Geral" passam.

## Fase E — Telas que faltam

**Entregáveis:**
- `/faturamento`, `/agenda-acessorios`, `/entregues`, `/cadastros`.

**Pronto pra Fase F quando:** critérios de aceite da seção "Telas novas" passam.

## Fase F — Relatórios e polish visual

**Entregáveis:**
- `/relatorios` com os 3 relatórios fixos + export CSV.
- Aplicação da paleta/design system de `02b-design-system.md` em todas as telas.
- Skeleton screens, empty states, confirmação de saída com dados não salvos.

**Pronto pra "v2 completo" quando:** todos os critérios de `05-criterios-aceite.md` passam e
o app roda com o dataset real de 1.642 veículos sem regressão de performance.

---

## Como pedir para começar

Este plano fica parado até aprovação explícita. Formas de destravar:

- **"Aprova o plano, começa pela Fase A"** — inicia implementação sequencial, uma fase por vez,
  com checkpoint de revisão ao final de cada fase (como já é praticado neste projeto).
- **"Quero mudar [X] antes de começar"** — ajusta este documento (ou o de perguntas de
  negócio) antes de tocar em código.
- **"Pula direto pra Fase B"** — possível, mas a Fase A é pré-requisito técnico real (schema e
  tipos precisam existir antes do Kanban funcionar) — seria feita "por baixo" mesmo assim,
  só sem os arquivos de schema documentados separadamente.

Nenhuma fase depende de decisão externa (fornecedor, aprovação de orçamento, etc.) — todas
podem começar assim que aprovadas.

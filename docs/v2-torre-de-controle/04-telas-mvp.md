# 04 · Telas do MVP v2

12 telas, na mesma numeração do briefing. "Existe" = já implementado no MVP v1 e só precisa
evoluir. "Novo" = tela que não existe ainda.

---

## 1. Dashboard Geral — status: existe, expandir

Rota: `/` (hoje é o Painel Kanban — vira Dashboard; Kanban muda pra `/pipeline`)

KPIs (cards com barra de acento, ver `02b-design-system.md`):

| KPI | Fonte | Tom |
|---|---|---|
| Total de veículos | `count(veiculo)` | navy |
| Aguardando faturamento | `status_atual = 01` | info |
| Faturados | `status_atual = 02` | info |
| Em pátio | `status_atual = 03` | info |
| Em preparação | `status_atual = 05` | info |
| Pendência de acessórios | tarefas categoria `acessorio` abertas | warning |
| Com recall/campanha | `recall_status IN (tem, em_servico)` | danger |
| Pendência de pagamento | `pago = false` | warning |
| Em movimentação | `movimentacao.prioridade != finalizado` | info |
| Aguardando agenda | `status_atual = 07` sem `agenda_entrega` | warning |
| Agendados | `status_atual = 08` | info |
| Entregues (período) | `status_atual = 09`, filtrado por data | success |
| SLA vencido | `daysSince(updated_at) > limiar` por fase | danger |
| Sem responsável | `veiculo.responsavel_id IS NULL` OR tarefa aberta sem responsável | danger |
| Bloqueio crítico | `avariado OR nf_cancelada OR tarefa bloqueante bloqueada` | danger |

Filtros rápidos: vendedor, local, status, cliente, modelo, data de faturamento, previsão de
entrega, responsável — mesmo padrão de filtro da Lista de Veículos (reaproveita componente).

Alertas críticos: lista compacta (estilo "notificações" do Topbar de referência) com os top N
veículos mais urgentes, link direto pra tela do veículo.

---

## 2. Estoque / Vida do Veículo — status: existe, expandir

Rota: `/veiculos` (existe). Adicionar:
- Alternância lista/cards (hoje só lista) — card no estilo `VeiculoCardPremium`
  (ver `02b-design-system.md`).
- Campo "próxima ação obrigatória" calculado (primeira tarefa bloqueante em aberto, ou "Aguarda
  NF" se em 01, ou "Aguarda agenda" se em 07).
- Campo "SLA da etapa" (dias desde `updated_at`, já existe como `daysSince`, expor na coluna).

---

## 3. Detalhe do Veículo por CHASSI — status: existe (básico), **redesenhar como mini-ambiente**

Rota: `/veiculos/:chassi` (existe). Vira um mini-ambiente com abas, no padrão do sistema de
referência (projeto com sub-rotas):

| Aba | Conteúdo |
|---|---|
| **Visão Geral** | Cabeçalho (chassi, modelo, cliente, vendedor, status), cards de Faturamento, Local/Destino, Flags, ação de avançar/reprovar (já existe, mantém) |
| **Tarefas** (novo) | Lista/kanban das tarefas deste veículo, agrupadas por categoria, com botão "Nova tarefa" |
| **Movimentação** | Histórico de movimentações deste chassi (já existe embutido, vira aba própria) |
| **Agenda** | Agenda de entrega + agenda de acessórios deste chassi (já existe embutido, vira aba própria) |
| **Histórico** | Timeline consolidada: status + tarefas + comentários + anexos, ordenados por data (novo — junta `status_historico` com `tarefa_historico`) |
| **Anexos** (novo) | Todos os anexos de todas as tarefas deste veículo, em grid |

Cabeçalho fixo (sticky) com: CHASSI, modelo, cliente, vendedor, status atual, botão avançar
etapa — igual ao header do `TaskDrawer` de referência, mas em tela cheia em vez de drawer
(o veículo é "mais importante" que uma tarefa isolada, por isso ganha tela própria, não drawer).

---

## 4. Pipeline Operacional — status: existe

Rota: `/pipeline` (era `/`). Kanban dos 10 estágios em 3 fases — já implementado, mantém como
está, só muda a rota.

---

## 5. Faturamento — status: **novo**

Rota: `/faturamento`

Lista de veículos filtrada por: em estoque sem cliente definido | reservado | aguardando
faturamento | faturado | venda direta | NF cancelada | pagamento pendente | pagamento
confirmado. Ação em lote: marcar NF, marcar pago. Mesma tabela rica da tela de Estoque, com
colunas focadas em NF/data_faturamento/pago/tipo_venda.

---

## 6. Preparação Técnica / Tarefas — status: **novo, núcleo desta rodada**

Rota: `/tarefas` (visão global, todas as tarefas de todos os veículos — análogo a
`app/tarefas/page.tsx` do sistema de referência)

- Visão Kanban (colunas = `tarefa_status`) e Visão Lista, com toggle — igual ao de referência.
- Agrupamento por urgência de prazo (vencido / hoje / próximos 3 dias / em dia) — reusa
  `getTaskUrgency` como padrão, adaptado a `tarefa.prazo`.
- Filtros: chassi, categoria, responsável, prioridade, status.
- Clique no card abre `TarefaDrawer` (lateral, 760px) com: header (checklist %, responsável,
  prazo), seções Checklist / Anexos / Comentários / Histórico — 1:1 com `TaskDrawer.tsx` de
  referência, adaptado.
- Botão "Nova tarefa" abre modal (`CreateTarefaModal`, adaptado de `CreateTaskModal.tsx`):
  chassi (obrigatório, autocomplete), título, categoria, responsável, prioridade, prazo, valor.

---

## 7. Movimentação Física — status: existe

Rota: `/movimentacao` — já implementado (fila 1-8). Adicionar coluna "responsável" e ação
rápida de mudar prioridade (já existe estrutura de dados, falta ação de UI).

---

## 8. Agenda de Entrega Técnica — status: existe (lista), adicionar calendário

Rota: `/agenda` — já implementado como lista agrupada por data. Adicionar toggle
dia/semana/mês (visão calendário) — usar componente de calendário simples (grid custom, sem
lib pesada, mesma filosofia "shadcn-style" do MVP atual).

---

## 9. Agenda de Acessórios — status: **novo (dado existe, tela não)**

Rota: `/agenda-acessorios`

Lista/fila de instalação: chassi, veículo, cliente, ordem, local, vendedor, data/hora
agendada, produtivo, valor, OS, descrição, status da instalação (deriva de tarefa vinculada
de categoria `acessorio`, se existir). Espelha `agenda_acessorios` (já no schema e no ETL,
31 linhas reais importadas).

---

## 10. Histórico de Entregues — status: **novo (dado existe via filtro, tela dedicada falta)**

Rota: `/entregues`

Lista de veículos com `status_atual IN (09_entregue, 10_encerrado)`, com busca e filtro por
período de entrega, vendedor, cliente. Cada linha abre a tela de detalhe (mesma de sempre,
mas o veículo aqui é somente-leitura pro pipeline principal — pode receber tarefa de
pós-venda, mas não volta de estágio sem ação administrativa explícita).

---

## 11. Cadastros de Apoio — status: **novo**

Rota: `/cadastros` com sub-abas: Vendedores, Locais, Implementos, Motivos de Reprovação.

CRUD simples sobre as tabelas de referência (`vendedor`, `local`, `implemento`,
`motivo_reprovacao`) — hoje só existem via seed, sem tela de administração. Inclui a visão de
aliases (duplicatas mescladas) para auditoria, ex.: `LUIZ CARLOS (aliases: LUIS CARLOS)`.

---

## 12. Relatórios Executivos — status: **novo**

Rota: `/relatorios`

3 relatórios fixos no MVP (mesma simplificação inteligente do Blue Team de referência: não
criar builder customizado agora):

1. **Produtividade por responsável** — tarefas concluídas/abertas por pessoa, tempo médio de
   conclusão.
2. **Custo de preparação por veículo/período** — soma de `tarefa.valor` por chassi/mês.
3. **SLA por fase** — tempo médio em cada estágio do pipeline, veículos que estouraram.

Exportação CSV no MVP (XLSX/PDF em V1, mesma priorização do sistema de referência).

---

## Resumo de rotas

| Rota | Tela |
|---|---|
| `/` | Dashboard Geral |
| `/veiculos` | Estoque / Vida do Veículo |
| `/veiculos/:chassi` | Detalhe do Veículo (mini-ambiente com abas) |
| `/pipeline` | Pipeline Operacional (Kanban) |
| `/faturamento` | Faturamento |
| `/tarefas` | Preparação Técnica / Tarefas |
| `/movimentacao` | Movimentação Física |
| `/agenda` | Agenda de Entrega Técnica |
| `/agenda-acessorios` | Agenda de Acessórios |
| `/entregues` | Histórico de Entregues |
| `/cadastros` | Cadastros de Apoio |
| `/relatorios` | Relatórios Executivos |

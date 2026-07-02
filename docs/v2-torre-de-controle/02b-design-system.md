# 02b · Design System — Adaptação do estilo "NEW SW-PAY" para Belcar

O sistema de referência usa Fluent 2 + marca própria (navy `#12173B` + laranja `#F26111`,
fontes Sora/Inter, escala de espaçamento 4pt, radius progressivo 2→18px). A estrutura é
excelente e será **reaproveitada quase 1:1** (sidebar fixa escura, topbar com breadcrumb e
busca, KPI cards com barra de acento no topo, drawer lateral de 760px para detalhe). A
**paleta** muda para refletir operação de caminhões, não estratégia digital.

## Paleta Belcar (nova, mantendo a arquitetura de tokens em 3 camadas)

| Token | Valor sugerido | Uso |
|---|---|---|
| `--color-brand-deep` | `#0F2540` (azul-aço escuro) | Sidebar, texto de destaque |
| `--color-brand-primary` | `#1E4A80` | Links, botão primário, ícones ativos |
| `--color-accent` | `#D97706` (âmbar/laranja industrial) | Acento, alertas de atenção, badge de prioridade alta |
| `--color-success` | `#16A34A` | Liberado, concluído, pago |
| `--color-warning` | `#D97706` | Pendência não crítica (não pago, aguardando) |
| `--color-danger` | `#DC2626` | Bloqueio crítico, SLA estourado, avariado |
| `--color-info` | `#3B82C4` | Em andamento, informativo |
| Fase 1 (Fluxo Interno) | cinza `#6B7280` | Header de coluna/seção |
| Fase 2 (Controle) | âmbar `#B45309` | Header de coluna/seção |
| Fase 3 (Entrega) | verde `#15803D` | Header de coluna/seção |

Mantém-se a escala de espaçamento 4pt e radius do sistema de referência
(`--radius-xl: 12px` para cards, `--radius-2xl: 14px` para cards maiores/drawers,
`--radius-3xl: 18px` para modais). Fonte: `Inter` para corpo (já em uso no MVP atual),
`Inter` semibold para títulos — sem necessidade de fonte de exibição própria (o sistema de
referência usa Sora; Belcar não precisa de uma segunda família, mantém consistência com o
que já está rodando).

## Ícones por domínio (analogia direta com o briefing, seção 6)

| Ícone (lucide-react) | Uso |
|---|---|
| `Truck` | Veículo, item de menu principal |
| `FileText` | NF, documentação |
| `MapPin` | Local atual, destino |
| `Calendar` | Agenda de entrega |
| `CheckSquare` | Tarefas, checklist |
| `AlertTriangle` | Alerta crítico, bloqueio |
| `Wrench` | Oficina, preparação |
| `Truck` + seta | Movimentação |
| `PackageCheck` | Entregue/encerrado |
| `DollarSign` | Faturamento, custo |

## Componentes a portar do sistema de referência (adaptando a chave de domínio)

| Componente de referência | Adaptação Belcar | Observação |
|---|---|---|
| `Sidebar.tsx` | Mesma estrutura, itens: Dashboard, Estoque, Pipeline, Faturamento, Preparação/Tarefas, Movimentação, Agenda Entrega, Agenda Acessórios, Entregues, Cadastros, Relatórios | Mantém padrão collapse + mobile drawer |
| `Topbar.tsx` | Breadcrumb com CHASSI ativo em vez de slug de projeto; busca global por chassi/cliente/vendedor | Remove sessão "DevTime" (não se aplica) |
| `KpiCard.tsx` | Reusar exatamente — já é genérico (label, value, icon, tone, trend) | Zero mudança estrutural |
| `TaskBadges.tsx` (`PriorityBadge`, `TaskStatusBadge`) | Reusar padrão de badge com ícone+cor+texto, trocar enums pra `tarefa_prioridade`/`tarefa_status` | |
| `TaskDrawer.tsx` | Vira `TarefaDrawer.tsx`: header com responsável/prazo/checklist, seções Checklist / Anexos / Comentários / Histórico | Remove seção "Tempo operacional" (DevTime) — não existe no domínio Belcar |
| Kanban de Tarefas (`app/tarefas/page.tsx`, dnd-kit) | Vira Kanban de Preparação Técnica: colunas = `tarefa_status`, cards agrupados por urgência de prazo | Mesmo padrão de agrupamento (vencido/hoje/em dia) |
| `ProjectCardPremium.tsx` (card 9:16 do hub) | Vira `VeiculoCardPremium.tsx`: chassi, modelo, cliente, status badge, barra de acento por fase, tarefas abertas, próxima ação | Substitui "logo do projeto" por nada (não há imagem do caminhão no MVP — ver perguntas de negócio sobre foto do veículo) |

## Padrões de interação a manter

- **Drawer lateral (não modal central)** para detalhe de tarefa — permite ver a lista atrás.
- **Confirmação antes de fechar com dados não salvos** (`window.confirm` no MVP, substituir por
  toast de undo em V1).
- **Empty states com ação clara** em toda tela vazia (`EmptyStatePremium.tsx` — reusar).
- **Badges sempre com ícone + texto + cor**, nunca só cor (acessibilidade, já é prática do MVP
  atual em `StatusBadge.tsx`).
- **KPI cards com barra de acento colorida no topo** — já demonstrado no `KpiCard.tsx` de
  referência, aplicar no Dashboard Geral do Belcar.

## O que NÃO portar (fora de escopo do domínio Belcar)

- Multi-tenant / Workspace — Belcar é uma concessionária única, sem necessidade de isolamento
  multi-empresa no MVP.
- CRM de funil de vendas — Belcar já vende via processo próprio (NF/faturamento), não tem
  funil de lead como o sistema de referência.
- DevTime (rastreamento de tempo de tela) — não se aplica a operação física de pátio/oficina.
- Financeiro completo (MRR, churn) — não é SaaS recorrente, é venda de ativo físico. O
  "Financeiro" do Belcar é o módulo de Faturamento + custo de preparação, mais simples.

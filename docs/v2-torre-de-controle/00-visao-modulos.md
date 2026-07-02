# 00 · Visão de Produto e Mapa de Módulos — Torre de Controle Belcar v2

Gerado em 2026-07-01, a partir da revisão do MVP existente (`docs/de-para-status.md`,
`db/schema.sql`, `app/`) e da análise estrutural do sistema de referência "NEW SW-PAY"
(gestão de projetos/tarefas/pessoas em estilo Fluent 2).

## TL;DR

O MVP atual já resolve a reconciliação de dados e o pipeline de 10 estágios com dados reais
(1.642 veículos). Esta rodada não descarta nada disso — ela adiciona a camada que faltava:
**tratar cada etapa do pipeline como um conjunto de tarefas atribuíveis, com responsável,
prazo, checklist, custo e anexo**, no mesmo espírito do módulo de Tarefas do sistema de
referência, e reorganiza a experiência em torno do **CHASSI como identidade central**
("Torre de Controle da Vida do Veículo"), não mais como "tela de estoque".

---

## O Problema (recontextualizado)

O MVP v1 já teve sucesso em substituir a leitura fragmentada da planilha por um pipeline
único de 10 estágios. O que ficou de fora, e que a operação sente na prática, é o mesmo
problema que o sistema de referência resolve para gestão de projetos: **etapas do processo
não têm dono, prazo nem evidência registrada**. Hoje, "Em Preparação" é um status — não diz
quem está lavando, quem está instalando o acessório, quanto custa, se já foi feito, nem
onde está a foto/nota fiscal daquele serviço.

## Para Quem

| Perfil | Necessidade principal |
|---|---|
| Gestor de operações (dono do pátio) | Saber o que está travado, de quem é a culpa, o que falta pra liberar |
| Vendedor | Saber se o veículo do seu cliente está pronto, quando vai ser entregue |
| Equipe de preparação (lavagem, acessórios, oficina) | Saber o que fazer hoje, marcar como feito, anexar evidência |
| Financeiro/faturamento | Saber o que está pendente de NF, pagamento, custo de acessório por veículo |
| Direção | Visão executiva: quantos veículos, quanto tempo parado, quanto custou preparar |

## Proposta de Valor

> "Uma torre de controle onde cada caminhão tem uma vida rastreável por CHASSI — e cada
> etapa dessa vida é uma tarefa com dono, prazo, custo e evidência, não uma célula de
> planilha em branco."

### Diferenciais sobre o MVP v1
1. **Tarefas por veículo** — cada etapa de preparação vira uma tarefa atribuível (responsável,
   prazo, checklist, custo, anexo), inspirado 1:1 no módulo de Tarefas do sistema de
   referência, mas com `chassi` no lugar de `projectId`.
2. **Tela do veículo como "mini-ambiente"** — assim como o sistema de referência trata cada
   projeto como um ambiente completo (Pessoas, Tarefas, CRM, Financeiro), a tela de detalhe do
   veículo passa a ter suas próprias abas: Visão Geral, Tarefas, Movimentação, Agenda,
   Histórico, Anexos.
3. **Timeline imutável de verdade** — todo evento (não só troca de estágio) vira uma linha de
   histórico: comentário, anexo, conclusão de tarefa, alteração de responsável.
4. **Custo por tarefa/preparação** — acessórios, OS e serviços de preparação carregam valor,
   permitindo somar "quanto custou preparar este veículo" no financeiro (hoje só existe
   `valor` solto na aba Acessórios da planilha, sem consolidação).
5. **Visual SaaS B2B denso e executivo** — sidebar fixa, topbar com busca global, KPI cards com
   barra de acento colorida, drawer lateral de detalhe — no mesmo padrão do sistema de
   referência, adaptado à paleta e ícones de operação de caminhões.

---

## Conceito Central

```
┌──────────────────────────────────────────────────────────────────────┐
│                    TORRE DE CONTROLE BELCAR                          │
│                                                                        │
│  Cada veículo (CHASSI) é um mini-ambiente:                           │
│                                                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │
│  │ VEÍCULO A  │  │ VEÍCULO B  │  │ VEÍCULO C  │   ...1.642 veículos  │
│  │ (chassi)   │  │ (chassi)   │  │ (chassi)   │                     │
│  │            │  │            │  │            │                     │
│  │ Visão Geral│  │ Visão Geral│  │ Visão Geral│                     │
│  │ Tarefas    │  │ Tarefas    │  │ Tarefas    │  ← NOVO nesta rodada │
│  │ Movimenta  │  │ Movimenta  │  │ Movimenta  │                     │
│  │ Agenda     │  │ Agenda     │  │ Agenda     │                     │
│  │ Histórico  │  │ Histórico  │  │ Histórico  │                     │
│  └────────────┘  └────────────┘  └────────────┘                     │
│                                                                        │
│  Dashboard Geral → consolida tudo em KPIs executivos + alertas       │
└──────────────────────────────────────────────────────────────────────┘
```

**Regra fundamental (herdada do sistema de referência, adaptada):** o Dashboard é a central
de decisão. Cada veículo é um mini-ambiente independente identificado por CHASSI. O pipeline
de 10 estágios continua sendo o eixo principal — Tarefas, Movimentação e Agenda são eixos
paralelos que **alimentam** o pipeline, nunca o substituem.

---

## Mapa de Módulos

| # | Módulo | Finalidade | Status |
|---|---|---|---|
| 1 | **Dashboard Geral** | Visão executiva consolidada, KPIs, alertas críticos | Existe (básico) → expandir |
| 2 | **Estoque / Vida do Veículo** | Lista rica de todos os veículos, independente de onde estão | Existe → expandir cards/filtros |
| 3 | **Detalhe do Veículo por CHASSI** | Mini-ambiente do veículo (abas) | Existe (básico) → **redesenhar como mini-ambiente** |
| 4 | **Pipeline Operacional (Kanban)** | Board dos 10 estágios em 3 fases | Existe |
| 5 | **Faturamento** | Definição de faturamento, NF, pagamento, bloqueios | Não existe como módulo próprio → **novo** |
| 6 | **Preparação Técnica / Tarefas** | Checklist de tarefas por veículo com responsável/custo/anexo | **Novo — núcleo desta rodada** |
| 7 | **Movimentação Física** | Fila de movimentação (eixo próprio) | Existe |
| 8 | **Agenda de Entrega Técnica** | Agenda diária/semanal/mensal | Existe (lista) → adicionar visão calendário |
| 9 | **Agenda de Acessórios** | Fila de instalação de acessórios | Existe nos dados, sem tela própria → **nova tela** |
| 10 | **Histórico de Entregues** | Veículos em 09/10, consulta histórica | Existe via filtro de lista → **tela dedicada** |
| 11 | **Cadastros de Apoio** | Vendedores, locais, implementos, motivos de reprovação | Existe só no banco → **nova tela de administração** |
| 12 | **Relatórios Executivos** | Exportação, relatórios fixos (produtividade, custo, SLA) | Não existe → **novo** |

Cada módulo novo ou expandido está detalhado em `04-telas-mvp.md`. O modelo de dados que
sustenta o módulo de Tarefas está em `02-modelo-dados.md`.

---

## Posicionamento (o que este sistema NÃO é)

| Não é | É |
|---|---|
| Um CRUD genérico de veículos | Uma torre de controle com regras que bloqueiam avanço sem responsável/NF/motivo |
| Uma cópia da planilha em tela bonita | Um modelo normalizado por CHASSI com histórico append-only |
| Um Trello genérico de tarefas | Tarefas sempre amarradas a um veículo e a uma fase do pipeline, com custo e evidência |
| Um sistema de projetos (como o de referência) | Um sistema de **ativos físicos rastreáveis** — a unidade central é o veículo, não o projeto |

---

## Visão de Longo Prazo

**Fase 1 (esta rodada):** Sistema de Tarefas por veículo + redesenho da tela de detalhe como
mini-ambiente + telas que faltam (Faturamento, Agenda de Acessórios, Histórico de Entregues,
Cadastros de Apoio) + visual redesenhado.

**Fase 2:** Relatórios executivos com exportação, permissões por papel, notificações in-app.

**Fase 3:** Importar `PROGRAMAÇÃO`/`ESTOQUE SHOWROOM` incrementalmente (fluxo contínuo, não só
carga inicial), autenticação real com RLS por papel.

**Futuro:** App para produtivo (equipe de preparação) marcar tarefa como feita direto do
celular, com foto obrigatória como evidência.

# Torre de Controle Belcar — MVP v2

Frontend da Torre de Controle da Vida do Veículo (Belcar). Stack: Vite +
React 18 + TypeScript + Tailwind v4 + shadcn/ui (componentes próprios sobre
Radix). Ver `../docs/de-para-status.md`, `../docs/perguntas-negocio.md`,
`../db/schema.sql` para a reconciliação de dados v1, e
`../docs/v2-torre-de-controle/` (11 documentos: visão, módulos, modelo de
dados, design system, pipeline/regras, telas, critérios de aceite, backlog,
perguntas de negócio, red/blue team, plano de implementação) para o desenho
completo do módulo de Tarefas e do redesenho v2.

## Rodando localmente

Este projeto está dentro de uma pasta sincronizada pelo Google Drive. O Google
Drive Desktop costuma travar/corromper o `npm install` porque tenta
sincronizar milhares de arquivos pequenos de `node_modules` em tempo real.
Recomendado:

1. Pausar a sincronização do Google Drive (ou mover esta pasta `app/` para
   fora do Drive, ex.: `C:\dev\belcar-app`) antes de rodar `npm install`.
2. `npm install`
3. `npm run dev` — abre em `http://localhost:5173`
4. `npm run build` — build de produção (`tsc -b && vite build`)

## Camada de dados

`src/data/store.ts` é um repositório mock em memória (persistido em
`localStorage`) com a MESMA forma de interface que um client Supabase real
teria — funções async, chassi como chave, nunca UPDATE destrutivo de status
(R4: toda transição grava uma linha nova em `statusHistorico`). Para trocar
por Supabase real:

1. Rode `db/schema.sql` e depois `db/seed_real.sql` (dados reais — ver abaixo)
   no seu projeto Supabase.
2. Reimplemente as funções de `src/data/store.ts` usando `@supabase/supabase-js`,
   mantendo as mesmas assinaturas.
3. Nenhuma página ou componente precisa mudar — todos consomem os hooks de
   `src/data/hooks.ts`.

### Dados reais vs. dados sintéticos

- `src/data/real-seed.json` — dados **reais** da planilha Belcar (1.642 veículos,
  vendedores/locais/implementos normalizados, movimentação, agenda e eventos
  de pós-venda), gerados por `db/etl.py` a partir dos CSVs exportados da
  planilha oficial. É o que `src/data/seed.ts` carrega hoje.
- `db/seed_real.sql` — o mesmo dado real, em INSERTs SQL, pronto pra rodar no
  Supabase depois de `db/schema.sql`.
- `db/seed.sql` — seed sintético (30 veículos de exemplo) da primeira rodada,
  mantido só como referência de formato, **não é mais o seed ativo do app**.
- `db/etl.py` — script Python que lê `G:\Meu Drive\belcar\csv\*.csv`, aplica o
  DE-PARA de `docs/de-para-status.md` e regenera `real-seed.json` +
  `seed_real.sql`. Já processa as 7 abas (`ESTOQUE`, `ESTOQUE SHOWROOM`,
  `PROGRAMAÇÃO`, `CAMINHÕES ENTREGUES`, `MOVIMENTAÇÃO BELCAR`, `AGENDA 2026`,
  `AGENDA DE ACESSÓRIOS`). Estágios 04 (Verificação de Documentação) e 06
  (Qualidade) continuam vazios — não é gap de importação, é que nenhuma aba
  real rastreia essas duas etapas hoje (ver `docs/perguntas-negocio.md`
  item 0).

## Regras de negócio implementadas (`src/lib/rules.ts`)

- **R1**: gate bloqueante — não sai de "01 Aguardando Faturamento" sem NF e
  data de faturamento.
- **R2**: não avança etapa sem responsável atribuído.
- **R3**: reprovado na Qualidade (06) volta para Preparação (05) com motivo
  obrigatório.
- **R4**: toda mudança de status grava uma linha nova em `statusHistorico`
  (nunca sobrescreve) — visível na timeline da tela de detalhe do veículo.
- **R5**: tarefa não vai para "Em Andamento" sem responsável.
- **R6**: veículo em "06 Qualidade" não avança para "07 Liberado" com tarefa
  bloqueante em aberto (recall, avaria, oficina, documentação, qualidade).
- **R7**: tarefa não vai para "Bloqueada" sem motivo obrigatório.
- **R8**: toda mudança relevante de uma tarefa grava uma linha nova em
  `tarefaHistorico` (append-only, mesmo padrão de R4).

## Páginas

- `/` Dashboard Geral — 15 KPIs, filtros combinados, alertas críticos
- `/pipeline` Kanban dos 10 estágios em 3 fases
- `/veiculos` Lista com filtros (estágio, vendedor, local, pendências)
- `/veiculos/:chassi` Detalhe do veículo como mini-ambiente (abas: Visão
  Geral, Tarefas, Movimentação, Agenda, Histórico, Anexos)
- `/tarefas` Preparação Técnica / Tarefas — Kanban + Lista, drawer com
  checklist/anexos/comentários/histórico
- `/faturamento` Situação de NF, pagamento e tipo de venda
- `/movimentacao` Fila de movimentação (eixo próprio, prioridade 1-8)
- `/agenda` Agenda de entrega técnica
- `/agenda-acessorios` Fila de instalação de acessórios
- `/entregues` Histórico de veículos entregues/encerrados
- `/cadastros` Vendedores, locais, implementos, motivos de reprovação
- `/relatorios` Produtividade, custo de preparação, SLA por fase (export CSV)
- `/fluxograma` Diagrama visual do pipeline + eixos paralelos + regras

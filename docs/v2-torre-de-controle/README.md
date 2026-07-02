# Torre de Controle Belcar v2 — Índice

Pacote de planejamento gerado em 2026-07-01, a partir da revisão do MVP existente e da
análise do sistema de referência "NEW SW-PAY" (módulo de Tarefas, design Fluent 2). Nenhum
código foi alterado nesta rodada — são os 11 entregáveis pedidos antes da implementação.

| # | Documento | Conteúdo |
|---|---|---|
| 00 | [Visão e Módulos](00-visao-modulos.md) | Visão executiva, proposta de valor, mapa de 12 módulos |
| 01 | [Fluxo da Vida do Veículo](01-fluxo-vida-veiculo.md) | Fluxo completo, o que cada tela precisa responder |
| 02 | [Modelo de Dados](02-modelo-dados.md) | Entidades novas (Tarefa e satélites), DDL delta, regras de dados |
| 02b | [Design System](02b-design-system.md) | Paleta Belcar, componentes a portar do sistema de referência |
| 03 | [Pipeline e Regras](03-pipeline-regras.md) | Pipeline (inalterado) + regras R1-R8 |
| 04 | [Telas do MVP](04-telas-mvp.md) | As 12 telas, rota por rota |
| 05 | [Critérios de Aceite](05-criterios-aceite.md) | Checklist testável por módulo |
| 06 | [Backlog por Fase](06-backlog-fases.md) | Fases A-F, o que fica fora desta rodada |
| 07 | [Perguntas de Negócio](07-perguntas-negocio.md) | Pendências específicas do módulo de Tarefas |
| 08 | [Red Team / Blue Team](08-red-blue-team.md) | Riscos + soluções recomendadas |
| 09 | [Plano de Implementação](09-plano-implementacao.md) | Fases executáveis + como aprovar o início |

## Como isso se relaciona com o que já existe

- `docs/de-para-status.md`, `docs/perguntas-negocio.md`, `db/schema.sql`, `db/seed_real.sql`,
  `db/etl.py` — **não mudam**. São a base de dados real (1.642 veículos) sobre a qual este
  pacote v2 constrói.
- `app/` — MVP v1 rodando, será estendido (não reescrito) seguindo `09-plano-implementacao.md`.

## Próximo passo

Ler `09-plano-implementacao.md` e aprovar o início pela Fase A.

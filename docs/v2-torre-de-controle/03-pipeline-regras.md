# 03 · Pipeline Principal e Regras de Negócio (v2 — consolidado)

O pipeline de 10 estágios **não muda** — já está fechado, validado por Red/Blue Team em rodada
anterior, e rodando com 1.642 veículos reais. Este documento consolida as regras já existentes
(`db/schema.sql`) com as novas regras do módulo de Tarefas.

## Pipeline Principal (inalterado)

1. Aguardando Faturamento
2. Faturado
3. Em Pátio
4. Verificação de Documentação
5. Em Preparação
6. Qualidade
7. Liberado
8. Agendado Cliente
9. Entregue
10. Encerrado

## Estados Paralelos (inalterado — nunca viram um 11º estágio)

| Estado paralelo | Onde vive | Nunca é status porque |
|---|---|---|
| Avariado, bateria, oficina falhas/parametrização | flags em `veiculo` + tarefa de categoria correspondente | Descrevem uma condição física, não uma fase do processo |
| Recall/campanha | `veiculo.recall_status` | Pode coexistir com qualquer estágio |
| Acessórios | `agenda_acessorios` + tarefa de categoria `acessorio` | É uma atividade dentro da preparação, não uma fase |
| Movimentação física | `movimentacao` (fila 1-8) | Eixo logístico independente do pipeline comercial |
| Pagamento pendente | `veiculo.pago = false` | É uma condição financeira, não uma etapa |
| **Tarefa aberta (novo)** | `tarefa` | Uma tarefa pode existir em qualquer estágio; o estágio não muda até as tarefas bloqueantes fecharem |

## Regras Duras (R1-R4, existentes — não mudam)

- **R1**: gate bloqueante — não sai de "Aguardando Faturamento" sem NF e data de faturamento.
- **R2**: não avança etapa sem responsável atribuído.
- **R3**: reprovado na Qualidade volta pra Preparação com motivo obrigatório.
- **R4**: toda mudança de status gera histórico (append-only, nunca sobrescreve).

## Regras Novas (R5-R8 — módulo de Tarefas)

- **R5 — R2 estendida a tarefas**: uma tarefa não pode ir para `em_andamento` sem
  `responsavel_id`. Implementada via trigger `fn_tarefa_exige_responsavel`
  (ver `02-modelo-dados.md`).
- **R6 — Gate de Qualidade por tarefas bloqueantes**: o veículo só avança de
  `06_qualidade` para `07_liberado` quando não existir nenhuma tarefa **bloqueante** aberta
  (`status IN ('a_fazer','em_andamento','bloqueada')`). Uma tarefa é bloqueante quando sua
  categoria está em `('recall','avaria','oficina_falhas','oficina_parametrizacao',
  'documentacao','qualidade')` — tarefas de `lavagem`/`acessorio`/`outro` são informativas e
  **não bloqueiam** (evita travar entrega por um detalhe cosmético; ver pergunta de negócio
  se essa lista de categorias bloqueantes está certa).
- **R7 — Tarefa bloqueada exige motivo**: mesma lógica de R3, aplicada à tarefa — não pode
  marcar `status = 'bloqueada'` sem `motivo_bloqueio`.
- **R8 — Histórico de tarefa é append-only**: mudança de status, responsável, prazo ou valor
  de uma tarefa gera linha em `tarefa_historico`, nunca sobrescreve (mesmo padrão de R4).

## Tabela de decisão: quando uma tarefa bloqueia o pipeline

| Categoria da tarefa | Bloqueia avanço 06→07? | Justificativa |
|---|---|---|
| `recall` | Sim | Segurança/compliance — não pode entregar com recall pendente |
| `avaria` | Sim | Veículo fisicamente com problema |
| `oficina_falhas` / `oficina_parametrizacao` | Sim | Pendência mecânica real |
| `documentacao` | Sim | É literalmente a etapa 04 |
| `qualidade` | Sim | É a inspeção que valida a etapa 06 |
| `lavagem` | Não | Cosmético — pode terminar em paralelo com o agendamento |
| `acessorio` | Não (default) — **pergunta de negócio**: alguns acessórios são contratuais (cliente pagou e exige) | Ver `07-perguntas-negocio.md` |
| `implemento` | Sim, se o veículo foi vendido com implemento específico | Depende do tipo de venda — ver pergunta de negócio |
| `faturamento` | Já coberto por R1, redundante como tarefa bloqueante de 06 | Não bloqueia aqui pois já bloqueou em 01 |
| `outro` | Não (default) | Categoria genérica, não crítica por definição |

## Regra de custo por veículo (nova)

- `SUM(tarefa.valor)` agrupado por `chassi` dá o **custo total de preparação** daquele
  veículo — usado no módulo de Relatórios Executivos e no card de Faturamento da tela do
  veículo. Não altera `veiculo.valor` (que é o valor de venda do veículo, campo já existente).

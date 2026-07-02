# 01 · Fluxo Completo da Vida do Veículo

## Fluxo mental (conforme briefing do usuário, mapeado ao pipeline já validado)

```
Veículo disponível na empresa
  (fábrica | pátio | showroom | implementador | trânsito | cliente | semi-novos | outro)
        │
        ▼
01 Aguardando Faturamento ──R1──► precisa de NF + data de faturamento pra sair daqui
        │
        ▼
02 Faturado
        │
        ▼
03 Em Pátio
        │
        ▼
04 Verificação de Documentação   ← gap real: nenhuma aba da planilha rastreia isso hoje
        │
        ▼
05 Em Preparação ◄─────────────────────────────┐
        │  (lavagem, acessórios, implemento,    │
        │   OS, recall, bateria, avaria,         │
        │   oficina falhas/parametrização —      │  R3: reprovado
        │   cada um vira uma TAREFA)             │  volta com motivo
        ▼                                        │  obrigatório
06 Qualidade ───────reprovado──────────────────►┘
        │ aprovado
        ▼
07 Liberado
        │
        ▼
08 Agendado Cliente
        │
        ▼
09 Entregue
        │
        ▼
10 Encerrado
        │
        ▼
   Pós-venda (revisão 6 meses / 1 ano) — fora do pipeline técnico
```

Este é o **mesmo pipeline de 10 estágios já fechado e validado** (ver
`docs/de-para-status.md`). Nada muda na sequência. O que muda é **o que acontece dentro de
cada estágio**, especialmente 04, 05 e 06 — hoje são só um rótulo de status; nesta rodada
viram um conjunto de tarefas rastreáveis.

## Eixos paralelos (não fazem parte do status principal — regra dura já estabelecida)

| Eixo | Tabela | Quando entra em jogo |
|---|---|---|
| **Tarefas** (novo) | `tarefa` | Principalmente 04/05/06, mas qualquer estágio pode ter tarefa aberta |
| **Movimentação física** | `movimentacao` | Qualquer estágio — fila própria de prioridade 1-8 |
| **Agenda de entrega** | `agenda_entrega` | A partir de 07/08 |
| **Agenda de acessórios** | `agenda_acessorios` | Principalmente 05 |
| **Flags de bloqueio** | campos em `veiculo` | Qualquer estágio (avariado, recall, nf_cancelada, pago) |
| **Pós-venda** | `pos_venda_evento` | Só depois de 10 Encerrado |

## Fluxo detalhado por etapa (o que a Torre de Controle precisa responder)

### 1. Veículo disponível na empresa
- **Onde ele está?** `veiculo.local_atual_id` — fábrica, pátio 1/2, showroom, implementador,
  trânsito (Gabardo), ANS, Itumbiara, Facchini, JRV, Holmes.
- **Quem é o responsável comercial?** `veiculo.vendedor_id`.
- **É venda direta, usado, semi-novo ou futura venda?** `veiculo.tipo_venda` (flag, não estágio).

### 2. Definição de faturamento (módulo novo: Faturamento)
- Regra R1: não sai de 01 sem `nf` e `data_faturamento` preenchidos.
- Transição 01 → 02 é o evento "definição de faturamento" — gera linha em
  `status_historico` e, se aplicável, fecha uma **Tarefa automática** "Emitir NF" que nasce
  junto com o veículo em 01 (ver `02-modelo-dados.md`, seção Tarefas automáticas).

### 3. Etapas físicas, administrativas e técnicas (módulo novo: Preparação Técnica)
- Cada necessidade física vira uma **Tarefa** com categoria:
  `lavagem | acessorio | implemento | os | recall | bateria | avaria | oficina_falhas |
  oficina_parametrizacao | documentacao | qualidade`.
- Tarefa tem: responsável obrigatório (R2 estendida a nível de tarefa), prazo, status
  (`a_fazer | em_andamento | bloqueada | concluida`), checklist interno, valor/custo,
  anexo (documento/imagem/áudio), comentários, histórico.

### 4. Tarefas atribuídas a responsáveis
- Sem responsável, a tarefa não pode ir para `em_andamento` — mesma lógica de R2 já aplicada
  ao veículo, replicada na tarefa.
- Painel "Minhas tarefas" (por responsável) — análogo ao indicador de carga por pessoa do
  sistema de referência (`RF-04.9`, `RF-05.12`).

### 5. Movimentação física quando necessário
- Não muda: continua eixo próprio (`movimentacao`), fila 1-8, nunca é status principal.
- Diferença desta rodada: movimentação pode **gerar uma tarefa automática** de acompanhamento
  ("Confirmar chegada no destino") quando a prioridade é `1_hoje` ou `2_amanha`.

### 6. Preparação, lavagem, equipamento, revisão e validação
- É a materialização de 05 Em Preparação como uma **lista de tarefas**, não um status solto.
- 06 Qualidade é o gate: só libera pra 07 quando todas as tarefas bloqueantes de 05 estão
  `concluida`. Reprovação em 06 volta pra 05 com **motivo obrigatório** (R3, já existente) —
  agora o motivo vira automaticamente uma nova Tarefa em 05 com a descrição do problema.

### 7. Agendamento com o cliente
- Não muda: `agenda_entrega`, conectado à tela do veículo.

### 8. Entrega
- Não muda: transição pra 09, encerra tarefas pendentes com aviso (não bloqueia, mas alerta).

### 9. Histórico de caminhões entregues
- Não muda estruturalmente: veículo em 09/10 continua existindo, com toda a timeline
  preservada (tarefas, anexos, comentários, movimentação, agenda) — nunca é arquivado ou
  apagado.

## O que a tela do veículo precisa responder (herdado do briefing, seção 8)

| Pergunta | Onde a resposta vive agora |
|---|---|
| Onde está o caminhão? | `local_atual_id` + última `movimentacao` |
| De quem é a responsabilidade agora? | `responsavel_id` do veículo + tarefas abertas com responsável |
| O que falta fazer? | Lista de tarefas não concluídas, agrupadas por categoria |
| Está faturado? Tem NF? Está pago? | Cartão de Faturamento na aba Visão Geral |
| Tem acessório? Tem recall? | Flags + tarefas de categoria `acessorio`/`recall` |
| Tem pendência de oficina? | Tarefas de categoria `oficina_falhas`/`oficina_parametrizacao` |
| Está liberado para entrega? | `status_atual == '07_liberado'` + zero tarefas bloqueantes abertas |
| Quando será entregue? | `agenda_entrega` vinculada ao chassi |
| O que aconteceu desde o início? | Timeline consolidada: `status_historico` + `tarefa_historico` + comentários + anexos, ordenados por data |

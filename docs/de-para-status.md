# DE-PARA: Status Real da Planilha → Pipeline de 10 Estágios

Gerado em 01/07/2026 a partir da auditoria de campo da planilha "Cópia de ENTREGA TECNICA -belcar".
Pipeline-alvo (fechado, não alterado nesta rodada):

- **Fase 1 — Fluxo Interno**: 01 Aguardando Faturamento · 02 Faturado · 03 Em Pátio
- **Fase 2 — Controle**: 04 Verificação de Documentação · 05 Em Preparação · 06 Qualidade · 07 Liberado
- **Fase 3 — Entrega**: 08 Agendado Cliente · 09 Entregue · 10 Encerrado
- Loop: 06 reprovado → volta pra 05 com motivo obrigatório (R3)

Decisão de negócio confirmada para esta rodada (MVP): status comerciais/ambíguos (`USADO`,
`SEMI NOVOS`, `FUTURA VENDA`, `VENDA DIRETA`) **entram no funil de 10 estágios no estágio mais
próximo**, carregando um flag de classificação comercial (`tipo_venda`) separado do status —
nunca viram um 11º estágio informal.

## 1. Status Comercial (aba `ESTOQUE`, campo `STATUS`)

| Valor real | Categoria | Estágio / Flag |
| --- | --- | --- |
| `FATURADO` | Mapeia direto | 02 Faturado |
| `ESTOQUE` | Mapeia direto | 03 Em Pátio |
| `VENDA DIRETA` | Mapeia direto + flag comercial | 02 Faturado, `tipo_venda = venda_direta` |

## 2. Status Operacional (abas `PROGRAMAÇÃO` e `CAMINHÕES ENTREGUES`, 17 valores)

| Valor real | Categoria | Estágio / Flag |
| --- | --- | --- |
| `ACESSÓRIOS` | Mapeia direto | 05 Em Preparação |
| `LAVAR` | Mapeia direto | 05 Em Preparação |
| `LAVADO` | Mapeia direto | 06 Qualidade (lavagem concluída, aguarda inspeção) |
| `AGENDAR` | Mapeia direto | 07 Liberado (pronto, falta agendar entrega) |
| `AGENDADO` | Mapeia direto | 08 Agendado Cliente |
| `ENTREGUE` | Mapeia direto | 09 Entregue |
| `ENTREGA ITUMBIARA` | Bloqueio/exceção paralela | 09 Entregue + flag `local_entrega = ITUMBIARA` (ver pergunta de negócio) |
| `AVARIADO` | Bloqueio/exceção paralela | 05 Em Preparação + flag `avariado = true` |
| `BATERIA` | Bloqueio/exceção paralela | 05 Em Preparação + flag `pendencia_bateria = true` |
| `OFICINA FALHAS` | Bloqueio/exceção paralela | 05 Em Preparação + flag `pendencia_oficina = 'falhas'` |
| `OFICINA PARAM.` | Bloqueio/exceção paralela | 05 Em Preparação + flag `pendencia_oficina = 'parametrizacao'` |
| `MOVIMENTAR` | Bloqueio/exceção paralela | 03 Em Pátio + linha criada em `movimentacao` (fila própria) |
| `NF CANCELADA` | Bloqueio/exceção paralela | 01 Aguardando Faturamento + flag `nf_cancelada = true` (reforça R1: sem NF válida não avança) |
| `USADO` | Classificação comercial (pendente de negócio, mapeado por decisão MVP) | 03 Em Pátio + `tipo_venda = usado` |
| `SEMI NOVOS` | Classificação comercial (pendente de negócio, mapeado por decisão MVP) | 03 Em Pátio + `tipo_venda = semi_novo` |
| `FUTURA VENDA` | Classificação comercial (pendente de negócio, mapeado por decisão MVP) | 03 Em Pátio + `tipo_venda = futura_venda` |
| `REVISAO 6 MESES` | Pós-venda | Fora dos 10 estágios — tabela `pos_venda_evento`, ocorre depois do 10 Encerrado |
| `REVISAO 1 ANO` | Pós-venda | Fora dos 10 estágios — tabela `pos_venda_evento`, ocorre depois do 10 Encerrado |

## 3. Fila de Movimentação (aba `MOVIMENTAÇÃO BELCAR`, 8 valores, eixo próprio)

Nunca é status principal. Vive em `movimentacao.prioridade`, ligada por CHASSI, eixo diferente do
status do veículo.

| Valor real | Categoria |
| --- | --- |
| `1 HOJE` | Fila de movimentação (prioridade 1) |
| `2 AMANHÃ` | Fila de movimentação (prioridade 2) |
| `3 AGENDADO` | Fila de movimentação (prioridade 3) |
| `4 NA FILA` | Fila de movimentação (prioridade 4) |
| `5 REMESSA ANS` | Fila de movimentação (prioridade 5) |
| `6 FINALIZADO` | Fila de movimentação (prioridade 6 — concluído) |
| `7 ONDE ESTÁ?` | Fila de movimentação (prioridade 7 — exceção de rastreio) |
| `8 AGUARD. PG` | Fila de movimentação (prioridade 8 — bloqueado por pagamento) |

## 4. Recall / Campanha — bloqueio/exceção paralela (nunca status)

| Valor real | Flag (`veiculo.recall_status`) |
| --- | --- |
| `TEM` | `tem` |
| `NÃO TEM` | `nao_tem` |
| `EM SERVIÇO` | `em_servico` |
| `REALIZADA` | `realizada` |
| `NÃO TEM PEÇA` | `nao_tem_peca` |

## 5. Pago — bloqueio/exceção paralela (nunca status)

| Valor real | Flag (`veiculo.pago`) |
| --- | --- |
| `PAGO` | `true` |
| `NÃO` | `false` |

## 6. Gap identificado

Nenhum valor real de status mapeia para **04 Verificação de Documentação**. A planilha atual não
rastreia essa etapa separadamente — é um gap de processo, não um erro de mapeamento. Ver
`perguntas-negocio.md`.

## 7. Referências normalizadas (duplicatas para merge)

- Vendedor: `LUIS CARLOS` é duplicata de `LUIZ CARLOS` → mesclar em `LUIZ CARLOS`.
- Local: grafias inconsistentes a resolver na seed (`PATIO 1`/`PATIO 2` mantidos como locais
  distintos; `EM TRANSITO - GABARDO` normalizado para local único vinculado a `GABARDO SP`/`GABARDO RJ`
  conforme contexto — ver pergunta de negócio sobre qual Gabardo é o destino padrão).

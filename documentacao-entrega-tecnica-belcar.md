# Documentação Técnica e Regras de Negócio

Planilha: **Cópia de ENTREGA TECNICA -belcar**  
Origem: Google Sheets  
URL: https://docs.google.com/spreadsheets/d/1C0gDDmtdMjl38U_r7MdeNEe2N88zCXwU4OrSPOgRy14/edit  
Locale: `pt_BR`  
Fuso horário: `America/Sao_Paulo`  
Data da documentação: 2026-07-01

## 1. Visão Geral

Esta planilha controla o fluxo operacional de entrega técnica de caminhões Belcar, incluindo:

- estoque atual de veículos;
- agenda de entregas técnicas;
- programação operacional;
- movimentação logística;
- acessórios, recall/campanha e ordens de serviço;
- histórico de caminhões entregues;
- controle específico de showroom.

A base é majoritariamente manual, com uso intensivo de listas suspensas para padronizar status, locais, vendedores, pagamento, campanha/recall e etapas de preparação. Não foram identificadas fórmulas de importação externa como `IMPORTRANGE`, `QUERY`, `VLOOKUP/PROCV` ou integrações com banco externo.

## 2. Base de Dados

O identificador operacional principal é o campo **CHASSI**, presente nas abas de estoque, programação, movimentação e entregues. Cada linha representa um veículo, uma entrega, uma movimentação ou uma atividade de acessórios, dependendo da aba.

### Entidades Principais

| Entidade | Onde aparece | Finalidade |
| --- | --- | --- |
| Veículo / caminhão | `ESTOQUE`, `CAMINHÕES ENTREGUES`, `PROGRAMAÇÃO`, `ESTOQUE SHOWROOM 1 - copia` | Controle por chassi, modelo/veículo, cliente, NF, vendedor, local e status. |
| Entrega técnica | `AGENDA 2026`, `PROGRAMAÇÃO`, `CAMINHÕES ENTREGUES` | Agenda, confirmação, modalidade, entregador, data e hora da entrega. |
| Movimentação | `MOVIMENTAÇÃO BELCAR`, `ESTOQUE` | Controle de retirada, destino, chegada e motorista. |
| Acessórios | `AGENDA DE ACESSÓRIOS`, `ESTOQUE`, `PROGRAMAÇÃO`, `CAMINHÕES ENTREGUES` | Controle de acessórios, OS, produtivo, valor e fila de instalação. |
| Recall / campanha | `ESTOQUE`, `PROGRAMAÇÃO`, `CAMINHÕES ENTREGUES` | Indica se há campanha, recall, serviço em andamento ou item já realizado. |

## 3. Abas da Planilha

| Aba | Linhas com dados | Colunas usadas | Fórmulas | Função |
| --- | ---: | --- | ---: | --- |
| `ESTOQUE` | 406 | A:W | 0 | Base principal de veículos em estoque ou faturados, com local atual, destino, vendedor, pagamento, acessórios, recall e observações. |
| `AGENDA DE ACESSÓRIOS` | 33 | A:L | 0 | Agenda e fila de instalação de acessórios por chassi, ordem, local, data/hora, produtivo, valor e OS. |
| `AGENDA 2026` | 1197 | A:O | 2390 | Agenda anual de entrega técnica, com cálculo automático do dia da semana e formatação por dia. |
| `MOVIMENTAÇÃO BELCAR` | 1022 | A:K | 0 | Controle de solicitações de movimentação, retirada, destino, chegada e motorista. |
| `CAMINHÕES ENTREGUES` | 1186 | A:W e AL | 0 | Histórico de veículos já entregues, com dados de entrega, pagamento, campanha, acessórios e OS. |
| `ESTOQUE SHOWROOM 1 - copia` | 239 | A:T | 1 | Recorte/controle de estoque vinculado a showroom, com local atual, destino e observações. |
| `PROGRAMAÇÃO` | 317 | A:U | 0 | Base operacional de veículos programados para preparação/entrega. |

## 4. Regras de Negócio

### 4.1 Identificação do Veículo

- O campo **CHASSI** é a chave operacional mais importante.
- O mesmo chassi pode aparecer em mais de uma aba conforme muda de etapa: estoque, programação, movimentação, agenda e histórico.
- O campo **VEICULO/MODELO** descreve o modelo comercial ou versão do caminhão.

### 4.2 Status Comercial e Operacional

Na aba `ESTOQUE`, o campo **STATUS** aceita:

- `FATURADO`
- `ESTOQUE`
- `VENDA DIRETA`

Nas abas `PROGRAMAÇÃO` e `CAMINHÕES ENTREGUES`, o campo **STATUS** operacional aceita variações como:

- `ACESSÓRIOS`
- `AGENDADO`
- `AGENDAR`
- `AVARIADO`
- `BATERIA`
- `ENTREGUE`
- `ENTREGA ITUMBIARA`
- `MOVIMENTAR`
- `OFICINA FALHAS`
- `OFICINA PARAM.`
- `USADO`
- `LAVAR`
- `LAVADO`
- `FUTURA VENDA`
- `REVISAO 6 MESES`
- `REVISAO 1 ANO`
- `SEMI NOVOS`
- `NF CANCELADA`

Regra prática: o status comercial indica a situação de venda/faturamento; o status operacional indica o que precisa acontecer fisicamente ou administrativamente com o veículo.

### 4.3 Local Atual, Destino e Movimentação

Os campos de local e destino são padronizados por listas suspensas. Os valores recorrentes incluem:

- `ANS`
- `AGENDADO`
- `DESTINO`
- `EM TRANSITO - GABARDO`
- `EXPOSIÇÃO / EVENTO`
- `FABRICA`
- `FACCHINI`
- `GABARDO RJ`
- `GABARDO SP`
- `HOLMES`
- `IMPLEMENTADOR`
- `ITUMBIARA`
- `JRV`
- `PATIO 1`
- `PATIO 2`
- `REMESSA ANS`
- `SEMI NOVOS`
- `SHOWROOM`
- `MOVIMENTAR`
- `CLIENTE`
- `SEM DESTINO`

Na aba `MOVIMENTAÇÃO BELCAR`, o status da movimentação segue uma fila operacional:

- `1  HOJE`
- `2 AMANHÃ`
- `3 AGENDADO`
- `4 NA FILA`
- `5  REMESSA ANS`
- `6 FINALIZADO`
- `7 ONDE ESTÁ?`
- `8 AGUARD. PG`

Essa numeração indica prioridade/ordem operacional, ajudando a separar movimentações imediatas, futuras, pendentes e finalizadas.

### 4.4 Pagamento

Os campos **PAGO** usam lista suspensa com:

- `PAGO`
- `NÃO`

Regra prática: quando o veículo ou serviço depende de pagamento, a coluna deve estar preenchida antes de concluir entrega, liberação ou movimentação definitiva.

### 4.5 Recall, Campanha e Acessórios

Campos de recall/campanha aceitam:

- `TEM`
- `NÃO TEM`
- `EM SERVIÇO`
- `REALIZADA`
- `NÃO TEM PEÇA`

Essa regra permite separar veículos sem pendência, com campanha pendente, em execução, concluída ou bloqueada por falta de peça.

Campos de acessórios aparecem como:

- indicador curto: `S`, `N`, `P`, `A`;
- indicador textual: `SIM`, `NÃO`, `OK`, `OS.`;
- descrição livre dos acessórios;
- OS associada;
- valor, quando aplicável.

Interpretação operacional recomendada:

- `S` / `SIM`: possui acessório ou demanda relacionada;
- `N` / `NÃO`: não possui;
- `P`: pendente;
- `A`: agendado ou em acompanhamento;
- `OK`: concluído;
- `OS.`: depende de ordem de serviço.

### 4.6 Implemento

Campos de **IMPLEMENTO** aceitam listas como:

- `BAU`
- `BAU - JRV`
- `BAU - FACCHINI`
- `CARROC. FLACH`
- `CARROC. JRV`
- `CAÇAMBA - FACCHINI`
- `CAÇAMBA - JRV`
- `FLACH`
- `NENHUM`
- `OUTRO`
- `PRANCHA - JRV`
- `ROLON OFF`
- `SIDER`
- `THERMO POINT`
- `VAI COLOCAR`
- `IMPLEMENTANDO`
- `PIPA - JRV`
- `PIPA`

Regra prática: o implemento informa se o caminhão está pronto, sem implemento, em implementação ou vinculado a fornecedor/parceiro específico.

### 4.7 Vendedores e Responsáveis

As listas de vendedores/responsáveis incluem nomes como:

- `ENEIAS`
- `JORGE`
- `EURIPEDES`
- `LUIZ CLAUDIO`
- `DOUGLAS`
- `GUSTAVO`
- `GUILHERME`
- `MARIANA`
- `RUI`
- `PAULO`
- `CRISTIANO`
- `FRANK`
- `LUIZ CARLOS`
- `CARLOS`
- `LUIS CARLOS`
- `WALERIA`
- `GADMA`
- `DANIELITON`
- `KRISLEY`
- `JOSUE`
- `LAILA`

Regra prática: o vendedor conecta o veículo ao responsável comercial e deve ser mantido padronizado para evitar duplicidade em relatórios e filtros.

### 4.8 Agenda de Entrega Técnica

Na aba `AGENDA 2026`:

- cada linha é um horário ou evento de agenda;
- a coluna `A` contém a data;
- a coluna `D` contém o horário;
- as colunas `E:G` identificam chassi/modelo/cliente;
- as colunas `H:O` controlam vendedor, lavado, acessórios, entregador, modalidade, agendamento, status e observações pós-entrega.

Horários aceitos na agenda:

- `08:00`
- `09:00`
- `09:30`
- `10:00`
- `11:00`
- `13:30`
- `14:00`
- `16:00`
- `A TARDE`
- `DE MANHÃ`
- `DIA TODO`
- `08 às 10`
- `10 ás 18:00`

## 5. Como as Fórmulas Foram Feitas

### 5.1 Aba `AGENDA 2026`

Esta é a aba com maior automação. Foram encontradas 2390 fórmulas, distribuídas nas colunas `B` e `C`.

#### Coluna B - Dia da Semana

Fórmula padrão:

```gs
=TEXT(A3;"DDD")
```

Aplicação:

- em `B3`, lê a data da célula `A3`;
- retorna a abreviação do dia da semana no locale da planilha;
- exemplo de retorno: `seg.`, `ter.`, `qua.`, `qui.`, `sex.`, `sáb.`;
- a fórmula é repetida linha a linha até `B1197`, ajustando a referência da coluna `A`.

Exemplos:

```gs
=TEXT(A4;"DDD")
=TEXT(A5;"DDD")
=TEXT(A1197;"DDD")
```

#### Coluna C - Dia da Semana em Maiúsculo

Fórmula padrão:

```gs
=UPPER(B3)
```

Aplicação:

- em `C3`, lê o resultado de `B3`;
- converte a abreviação para maiúsculas;
- exemplo de retorno: `SEG.`, `TER.`, `QUA.`, `QUI.`, `SEX.`, `SÁB.`;
- a fórmula é repetida linha a linha até `C1197`.

Exemplos:

```gs
=UPPER(B4)
=UPPER(B5)
=UPPER(B1197)
```

#### Formatação Condicional

A aba `AGENDA 2026` usa regras de formatação condicional no intervalo `A3:O1197`, baseadas no valor da coluna `C`.

Regras encontradas:

```gs
=$C3="SEG."
=$C3="TER."
=$C3="QUA."
=$C3="QUI."
=$C3="SEX."
```

Como funciona:

- a fórmula da regra usa `$C3`, fixando a coluna `C` e deixando a linha variar;
- cada linha de `A:O` recebe cor conforme o dia da semana calculado;
- a cor ajuda a leitura visual da agenda por dia útil.

Ponto de atenção:

- as fórmulas de `B` e `C` não tratam data vazia;
- quando `A` está vazia, o Google Sheets interpreta o vazio como data zero e pode exibir `sáb.` / `SÁB.`;
- se a intenção for deixar a célula em branco quando não houver data, uma fórmula mais segura seria:

```gs
=IF(A3="";"";TEXT(A3;"DDD"))
```

e, na coluna `C`:

```gs
=IF(B3="";"";UPPER(B3))
```

### 5.2 Aba `ESTOQUE SHOWROOM 1 - copia`

Foi encontrada uma fórmula isolada:

```gs
=TODAY()
```

Local:

- célula `H19`.

Função:

- retorna automaticamente a data atual;
- provavelmente usada como data solicitada ou marco operacional temporário em uma linha específica.

Ponto de atenção:

- `TODAY()` muda todos os dias;
- se a data deveria ser histórica/fixa, o valor deve ser colado como data estática.

### 5.3 Demais Abas

As abas abaixo não possuem fórmulas detectadas:

- `ESTOQUE`
- `AGENDA DE ACESSÓRIOS`
- `MOVIMENTAÇÃO BELCAR`
- `CAMINHÕES ENTREGUES`
- `PROGRAMAÇÃO`

Nelas, a consistência é garantida principalmente por:

- listas suspensas;
- formatação;
- congelamento de cabeçalho;
- padronização manual dos campos.

## 6. Dicionário de Dados por Aba

### 6.1 `ESTOQUE`

Campos:

| Coluna | Campo | Descrição |
| --- | --- | --- |
| A | CHASSI | Identificador do veículo. |
| B | VEICULO | Modelo ou versão. |
| C | COR | Cor do veículo. |
| D | FATUR. fabri. | Data de faturamento pela fábrica. |
| E | CLIENTE | Cliente associado. |
| F | STATUS | Status comercial: faturado, estoque ou venda direta. |
| G | LOCAL - HOJE | Local atual do veículo. |
| H | MOVIMENTAÇÃO DESTINO | Destino ou próxima movimentação. |
| I | DATA SOLIC. | Data de solicitação. |
| J | ENTREGA | Informação de entrega. |
| K | DATA DE FAT. | Data de faturamento. |
| L | NF | Nota fiscal. |
| M | VENDEDOR | Responsável comercial. |
| N | PAGO | Situação de pagamento. |
| O | ACS. | Indicador de acessórios. |
| P | OS | Ordem de serviço. |
| Q | RECALL | Situação de recall/campanha. |
| R | VALOR | Valor associado. |
| S | ACESSÓRIOS / RECALL | Descrição dos acessórios ou recall. |
| T | TIPO | Tipo de serviço/registro. |
| U | STATUS | Status operacional/preparação. |
| V | OBS | Observação. |
| W | OBS: | Observação complementar. |

### 6.2 `AGENDA DE ACESSÓRIOS`

Campos:

| Coluna | Campo | Descrição |
| --- | --- | --- |
| A | CHASSI | Veículo relacionado. |
| B | VEICULO | Modelo/veículo. |
| C | CLIENTE | Cliente. |
| D | ORDEM | Posição na fila/estado do serviço. |
| E | LOCAL | Local de execução. |
| F | VENDEDOR | Responsável comercial. |
| G | DT AGENDA | Data agendada. |
| H | HR AGENDA | Hora agendada. |
| I | PRODUTIVO | Produtivo responsável. |
| J | VALOR | Valor do serviço/acessórios. |
| K | OS. | Ordem de serviço. |
| L | ACESSÓRIOS | Descrição dos acessórios. |

### 6.3 `AGENDA 2026`

Campos:

| Coluna | Campo | Descrição |
| --- | --- | --- |
| A | DATA | Data da entrega/evento. |
| B | DIA | Dia da semana calculado com `TEXT`. |
| C | DIA | Dia da semana em maiúsculo, usado na formatação condicional. |
| D | HORA | Horário ou período da agenda. |
| E | CHASSI | Veículo. |
| F | MODELO | Modelo. |
| G | CLIENTE | Cliente. |
| H | VENDEDOR | Responsável comercial. |
| I | LAVADO | Situação de lavagem/preparação. |
| J | ACES. | Indicador de acessórios. |
| K | ENTREGADOR | Responsável pela entrega. |
| L | MODALIDADE | Tipo de entrega. |
| M | AGENDAMENTO | Situação do agendamento. |
| N | STATUS | Status da entrega. |
| O | OBS: PÓS ENTREGA | Observações após a entrega. |

### 6.4 `MOVIMENTAÇÃO BELCAR`

Campos:

| Coluna | Campo | Descrição |
| --- | --- | --- |
| A | CHASSI | Veículo a movimentar. |
| B | CLIENTE | Cliente. |
| C | VENDEDOR | Solicitante/responsável. |
| D | DATA | Data da solicitação/movimentação. |
| E | MODELO | Modelo do veículo. |
| F | STATUS | Etapa da movimentação. |
| G | RETIRADA | Local de retirada. |
| H | DATA RETIRADA - OBS | Data de retirada e observações. |
| I | ENVIAR PARA | Destino. |
| J | DATA CHEGADA | Data de chegada. |
| K | MOTORISTA | Motorista/responsável pela movimentação. |

### 6.5 `CAMINHÕES ENTREGUES`

Campos:

| Coluna | Campo | Descrição |
| --- | --- | --- |
| A | CHASSI | Veículo entregue. |
| B | VEICULO | Modelo. |
| C | OS | Ordem de serviço principal. |
| D | IMPLEMENTO | Implemento do veículo. |
| F | STATUS | Status final ou operacional. |
| G | CLIENTE | Cliente. |
| H | LOCAL | Local relacionado à entrega. |
| I | ACES. | Indicador de acessórios. |
| J | PAGO | Pagamento. |
| K | CAMPANHA | Recall/campanha. |
| L | LOCAL | Local/observação complementar. |
| M | VENDA DT | Data de venda. |
| N | NF | Nota fiscal. |
| O | VENDEDOR | Vendedor. |
| P | DT ENT. | Data de entrega. |
| Q | HR ENT. | Hora de entrega. |
| S | VALOR | Valor associado. |
| T | OS. | Ordem de serviço de acessórios/serviço. |
| U | ACESSÓRIOS | Descrição dos acessórios. |
| V/W | Datas/horários soltos | Há valores de data/hora em algumas linhas; não parecem ser cabeçalhos estruturais globais. |

### 6.6 `ESTOQUE SHOWROOM 1 - copia`

Campos:

| Coluna | Campo | Descrição |
| --- | --- | --- |
| A | CHASSI | Identificador do veículo. |
| B | VEICULO | Modelo. |
| C | COR | Cor. |
| D | DT FATUR. | Data de faturamento. |
| E | CLIENTE | Cliente ou observação de estoque. |
| F | LOCAL - HOJE | Local atual. |
| G | MOVIMENTAÇÃO DESTINO | Destino/movimentação. |
| H | DATA SOLICITADA | Data solicitada; contém a fórmula `TODAY()` em uma linha. |
| I | DATA ENTREGA | Data de entrega. |
| J | DATA DE FAT. | Data de faturamento. |
| K | NF | Nota fiscal. |
| L | VENDEDOR | Vendedor. |
| M | PAGO | Pagamento. |
| N | OS | Ordem de serviço. |
| O | RECALL | Recall/campanha. |
| P | ACESSÓRIOS | Acessórios. |
| Q | TIPO | Tipo. |
| S | OBS | Observação. |
| T | OBS: | Observação complementar. |

### 6.7 `PROGRAMAÇÃO`

Campos:

| Coluna | Campo | Descrição |
| --- | --- | --- |
| A | CHASSI | Veículo programado. |
| B | VEICULO | Modelo. |
| C | OS | Ordem de serviço. |
| D | IMPLEMENTO | Implemento. |
| F | STATUS | Status operacional. |
| G | CLIENTE | Cliente. |
| H | LOCAL | Local atual. |
| I | ACES. | Indicador de acessórios. |
| J | PAGO | Pagamento. |
| K | CAMPANHA | Recall/campanha. |
| L | LOCAL | Local complementar/destino. |
| M | VENDA DT | Data de venda. |
| N | NF | Nota fiscal. |
| O | VENDEDOR | Vendedor. |
| P | DT ENT. | Data de entrega. |
| Q | HR ENT. | Hora de entrega. |
| S | VALOR | Valor. |
| T | OS. | Ordem de serviço complementar. |
| U | ACESSÓRIOS | Descrição dos acessórios. |

## 7. Observações Técnicas

- Todas as abas têm cabeçalho congelado até a linha 2.
- A planilha usa listas suspensas para reduzir erro de digitação e manter filtros consistentes.
- A maior parte das regras está na validação de dados, não em fórmulas.
- A aba `AGENDA 2026` tem automação simples e clara, mas as fórmulas de dia da semana deveriam tratar células vazias para evitar `SÁB.` em linhas sem data.
- As abas `PROGRAMAÇÃO` e `CAMINHÕES ENTREGUES` compartilham estrutura muito parecida, indicando fluxo de "programado" para "entregue".
- `ESTOQUE` é a base operacional central; `CAMINHÕES ENTREGUES` funciona como histórico.

## 8. Recomendações de Governança

- Definir o campo **CHASSI** como chave obrigatória nas abas operacionais.
- Padronizar nomes duplicados ou variações, por exemplo `LUIZ CARLOS` e `LUIS CARLOS`.
- Padronizar grafias de locais, por exemplo `PATIO`/`PÁTIO`, `EM VIAJEM`/`EM VIAGEM`.
- Revisar colunas sem cabeçalho estrutural, como `E`, `R`, `V` e `W` em algumas abas.
- Alterar fórmulas de `AGENDA 2026` para versões com `IF`, evitando dia da semana em linhas sem data.
- Se o volume crescer, separar cadastros de apoio em abas próprias: vendedores, locais, status, implementos, motoristas e horários.

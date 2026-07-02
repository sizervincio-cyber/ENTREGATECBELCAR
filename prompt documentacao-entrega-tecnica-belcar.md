# Prompt: Reconciliação de Dados, Torre de Controle Belcar
Gerado em 01/07/2026, a partir da auditoria forense da planilha "Cópia de ENTREGA TECNICA -belcar".
Passou por Red Team e Blue Team antes de ser fechado.

---

## Persona
Você é um engenheiro de dados e arquiteto de sistemas sênior, especializado
em reconciliar processos operacionais reais (capturados em planilhas
legadas) com modelos de domínio já desenhados, para sistemas de gestão de
frotas e concessionárias de veículos pesados. Você já tem contexto do
projeto "Torre de Controle, Entrega Técnica Belcar" e não deve redesenhar
o que já foi validado, apenas reconciliar com o dado real.

## Contexto
O projeto Torre de Controle Belcar já tem um modelo alvo fechado, validado
por Red Team e Blue Team em rodada anterior:

- Pipeline de 10 status em 3 fases (não alterar):
  - Fase 1 Fluxo Interno: 01 Aguardando Faturamento, 02 Faturado, 03 Em Pátio
  - Fase 2 Controle: 04 Verificação de Documentação, 05 Em Preparação
    (lavagem, acessórios), 06 Qualidade (aprova/reprova), 07 Liberado
  - Fase 3 Entrega: 08 Agendado Cliente, 09 Entregue, 10 Encerrado
  - Loop de reprovação: 06 volta pra 05 com motivo obrigatório

- Regras duras, não negociáveis:
  - R1: gate bloqueante, não sai de "Aguardando Faturamento" sem NF e
    data de faturamento
  - R2: não avança etapa sem responsável atribuído (dor número um do negócio)
  - R3: reprovado na Qualidade volta pra Preparação com motivo obrigatório
  - R4: toda mudança de status gera histórico e atualiza SLA

- Stack fechada: Vite, React 18, TypeScript, Tailwind, shadcn/ui,
  Supabase (Postgres, Auth, RLS, Storage), pronto pra Lovable

- Fluxo de build: Claude Code gera o codebase completo, handoff via
  GitHub, importa no Lovable pra deploy. Entrega em fases com critério
  de aceite, nunca tudo de uma vez.

O que mudou agora: existe a auditoria de campo completa da planilha real
que a operação usa hoje (7 abas, 4.400 linhas), com dicionário de dados
coluna a coluna. Essa planilha não fala a mesma língua do pipeline de 10
status: usa cerca de 28 valores de "estado" espalhados em 3 campos
diferentes, misturando etapa, bloqueio, classificação comercial e
pós-venda no mesmo lugar.

## Tarefa
Antes de qualquer geração de código ou UI, feche a reconciliação de dados:

1. Produza um DE-PARA completo entre os valores reais de status (dados
   abaixo) e o pipeline de 10 estágios, classificando cada valor em uma
   destas 4 categorias:
   - Mapeia direto pra um estágio (diga qual)
   - É condição de bloqueio ou exceção paralela (flag, não etapa)
   - É classificação comercial fora do escopo do pipeline técnico
     (marcar como pendente de decisão de negócio)
   - É pós-venda (ocorre depois do estágio 10 Encerrado)

2. Entregue o schema normalizado final (DDL comentado, Postgres,
   compatível com Supabase e RLS), incluindo:
   - Tabela central de veículo (chave CHASSI) com o status atual sempre
     como um dos 10 valores do pipeline, nunca um valor bruto da planilha
   - Tabela de histórico de status (implementa R4: todo evento vira uma
     linha nova, nunca um UPDATE destrutivo)
   - Bloqueio ou exceção como flag ou tabela separada, nunca misturado
     no status principal
   - Tabelas de referência para vendedor, local, implemento e motivo de
     reprovação, já com a normalização de duplicatas conhecidas
   - Tabela de movimentação (fila própria, ligada por CHASSI, eixo
     diferente do status principal)
   - Tabela de agenda de entrega e agenda de acessórios

3. Gere os scripts de seed das tabelas de referência com os valores
   reais já mapeados, marcando duplicatas para merge

4. Liste, em seção separada, as perguntas de negócio pendentes que só o
   Belcar pode responder. Comece com a lista abaixo e complete com o que
   mais encontrar

Não gere frontend, autenticação ou CRUD nesta rodada. Esta é a etapa de
fechamento de dados, a próxima rodada usa este output como insumo fixo.

## Dados disponíveis
<<<
FONTE: planilha "Cópia de ENTREGA TECNICA -belcar" (Google Sheets, pt_BR,
America/Sao_Paulo), 7 abas, chave universal CHASSI.

ABAS: ESTOQUE (406 linhas, A:W) | AGENDA DE ACESSÓRIOS (33, A:L) |
AGENDA 2026 (1197, A:O, 2390 fórmulas cosméticas de dia da semana) |
MOVIMENTAÇÃO BELCAR (1022, A:K) | CAMINHÕES ENTREGUES (1186, A:W e AL) |
ESTOQUE SHOWROOM 1 - copia (239, A:T, 1 fórmula =TODAY()) |
PROGRAMAÇÃO (317, A:U)

IMPORTANTE: não há fórmula de cálculo de negócio (comissão, margem,
preço). As únicas fórmulas existentes são cosméticas (dia da semana,
data atual). Toda a lógica de negócio está em validação de dado (lista
suspensa), não em fórmula.

STATUS COMERCIAL (aba ESTOQUE): FATURADO | ESTOQUE | VENDA DIRETA

STATUS OPERACIONAL (abas PROGRAMAÇÃO e CAMINHÕES ENTREGUES), 17 valores:
ACESSÓRIOS, AGENDADO, AGENDAR, AVARIADO, BATERIA, ENTREGUE, ENTREGA
ITUMBIARA, MOVIMENTAR, OFICINA FALHAS, OFICINA PARAM., USADO, LAVAR,
LAVADO, FUTURA VENDA, REVISAO 6 MESES, REVISAO 1 ANO, SEMI NOVOS, NF
CANCELADA

FILA DE MOVIMENTAÇÃO (aba MOVIMENTAÇÃO BELCAR), com ordem de prioridade:
1 HOJE, 2 AMANHÃ, 3 AGENDADO, 4 NA FILA, 5 REMESSA ANS, 6 FINALIZADO,
7 ONDE ESTÁ?, 8 AGUARD. PG

RECALL OU CAMPANHA: TEM | NÃO TEM | EM SERVIÇO | REALIZADA | NÃO TEM PEÇA

PAGO: PAGO | NÃO

VENDEDORES (21 nomes, com duplicata conhecida): ENEIAS, JORGE, EURIPEDES,
LUIZ CLAUDIO, DOUGLAS, GUSTAVO, GUILHERME, MARIANA, RUI, PAULO, CRISTIANO,
FRANK, LUIZ CARLOS, CARLOS, LUIS CARLOS (duplicata de LUIZ CARLOS),
WALERIA, GADMA, DANIELITON, KRISLEY, JOSUE, LAILA

LOCAIS (20 valores, com inconsistência de grafia a resolver): ANS,
AGENDADO, DESTINO, EM TRANSITO - GABARDO, EXPOSIÇÃO/EVENTO, FABRICA,
FACCHINI, GABARDO RJ, GABARDO SP, HOLMES, IMPLEMENTADOR, ITUMBIARA, JRV,
PATIO 1, PATIO 2, REMESSA ANS, SEMI NOVOS, SHOWROOM, MOVIMENTAR, CLIENTE,
SEM DESTINO

IMPLEMENTO (18 valores): BAU, BAU-JRV, BAU-FACCHINI, CARROC. FLACH,
CARROC. JRV, CAÇAMBA-FACCHINI, CAÇAMBA-JRV, FLACH, NENHUM, OUTRO,
PRANCHA-JRV, ROLON OFF, SIDER, THERMO POINT, VAI COLOCAR, IMPLEMENTANDO,
PIPA-JRV, PIPA

O documento completo com dicionário coluna a coluna das 7 abas deve ser
anexado junto com este prompt (documentacao-entrega-tecnica-belcar.md).
Use-o como fonte de verdade para qualquer campo não citado acima.

PERGUNTAS DE NEGÓCIO JÁ IDENTIFICADAS (adicione as que você encontrar):
- USADO, SEMI NOVOS e FUTURA VENDA entram no mesmo pipeline técnico de
  entrega, ou são operação separada (troca ou seminovo) fora do escopo
  da Torre de Controle?
- VENDA DIRETA segue o mesmo funil de 10 estágios ou pula etapas?
- REVISAO 6 MESES e REVISAO 1 ANO são pós-venda (depois do Encerrado) ou
  reabrem o pipeline?
- O campo HORA em AGENDA 2026 mistura horário fixo (09:00), bloco
  (A TARDE, DIA TODO) e faixa (08 às 10). Qual formato vale daqui pra frente?
- MOTORISTA (aba MOVIMENTAÇÃO BELCAR) é texto livre hoje. Vira cadastro
  próprio ou continua texto livre?
- ENTREGA ITUMBIARA é status próprio ou é ENTREGUE mais local Itumbiara?
>>>

## Regras
- Não reabra decisões já fechadas (10 estágios, R1 a R4, stack). Se
  achar um conflito genuíno entre o dado real e o modelo fechado,
  registre como pergunta de negócio, não decida sozinho e não altere o
  modelo alvo.
- Não invente valor de status, local, vendedor ou implemento fora das
  listas acima ou do documento anexo.
- Todo valor de status operacional que não mapear claramente pra um dos
  10 estágios vira flag ou campo separado, nunca um décimo primeiro
  estágio informal.
- Schema precisa rodar em Supabase (Postgres mais RLS) sem adaptação manual.
- CHASSI é chave obrigatória e única na tabela central de veículo.
- Nenhuma migração destrutiva: histórico sempre em tabela de log, nunca
  sobrescrito.
- Não gere componente de UI, tela ou rota nesta entrega.

## Formato de saída esperado
1. Tabela DE-PARA (status real, categoria, estágio ou flag ou fora de
   escopo ou pós-venda)
2. Schema SQL comentado, pronto pra rodar no Supabase
3. Scripts de seed das tabelas de referência
4. Lista final de perguntas de negócio pendentes, priorizada por impacto
   (o que bloqueia a próxima fase do build versus o que pode esperar)

## TL;DR
Reconciliar o pipeline de 10 status já validado da Torre de Controle com
os cerca de 28 valores de estado reais da planilha operacional, fechar o
schema Postgres/Supabase e a lista de decisões de negócio pendentes, sem
tocar em UI ainda.

# Perguntas de Negócio Pendentes — Torre de Controle Belcar

Priorizadas por impacto: **P0** bloqueia a próxima fase do build (schema/regras já assumem uma
resposta provisória que precisa ser confirmada) · **P1** pode esperar (afeta UX/relatório, não a
integridade do dado) · **P2** cosmético/pode esperar bastante.

## P0-A — Achados da carga de dados reais (ETL 2026-07-01, `db/etl.py`)

Estas 7 abas já foram processadas: `ESTOQUE`, `ESTOQUE SHOWROOM`, `PROGRAMAÇÃO`,
`CAMINHÕES ENTREGUES`, `MOVIMENTAÇÃO BELCAR`, `AGENDA 2026`, `AGENDA DE ACESSÓRIOS` — 1.642
veículos únicos consolidados. Relatório completo em `db/etl_report.txt`.

0. **RESOLVIDO** — `PROGRAMAÇÃO.csv` e `ESTOQUE SHOWROOM 1 - copia.csv` foram exportados e
   processados. A Fase 2 (Controle) agora tem dado real: 222 em **Em Preparação**, 4 em
   **Liberado**, 3 em **Agendado Cliente**. Dois estágios continuam com zero veículos, mas agora
   por um motivo diferente (confirmado, não é mais gap de importação):
   - **04 Verificação de Documentação**: nenhuma das 7 abas tem um campo/valor que represente
     essa etapa. Ela não é rastreada em lugar nenhum da planilha hoje — é uma etapa nova que a
     Torre de Controle introduz. Confirmar com a operação como isso deve funcionar no dia 1 (ver
     item 3 abaixo, já listado antes deste achado).
   - **06 Qualidade**: o único token real que mapeia pra cá é `LAVADO` (coluna STATUS de
     `PROGRAMAÇÃO`/`CAMINHÕES ENTREGUES`), e esse valor não apareceu em nenhuma linha real das
     abas processadas — `LAVADO` só aparece como coluna separada em `AGENDA 2026` (indicador de
     lavagem da entrega), não como STATUS do veículo. Ou seja, a etapa "Qualidade" como aprovação
     formal antes da liberação também não é registrada hoje — reforça a pergunta 3 abaixo.

0.1. **Cerca de 40 chassis existem tanto em `ESTOQUE.csv` quanto em `CAMINHÕES ENTREGUES.csv`**
   com dados diferentes (veículo voltou pra revisão, ou a aba `ESTOQUE` não foi limpa depois da
   venda). Regra aplicada no ETL: `CAMINHÕES ENTREGUES` sempre vence (estado terminal). Confirmar
   se essa prioridade está correta ou se `ESTOQUE` deveria vencer em algum caso (ex.: veículo
   comprado de volta / troca).

0.2. **Linhas de `CAMINHÕES ENTREGUES.csv` com dado na coluna errada.** Cerca de 86 ocorrências
   (cliente/status/observação vazando pra coluna VENDEDOR) e 18 ocorrências (data/cor/número de OS
   vazando pra coluna IMPLEMENTO) — não é bug de leitura, é erro de digitação na planilha original
   (confirmado linha a linha, ver `db/etl_report.txt`, seção "Valores REJEITADOS"). O ETL descarta
   esses valores (fica null) em vez de criar vendedor/implemento falso. Não bloqueia o MVP, mas
   indica que a planilha tem inconsistência de preenchimento que vale limpar antes de uma migração
   definitiva.

0.3. **Linhas de `ESTOQUE.csv` com `STATUS = ESTOQUE` mas com cliente, NF e data de faturamento
   preenchidos** (ex.: chassi `VR000268` — cliente "2H TRANSPORTES", NF `1044990`, mas STATUS diz
   "ESTOQUE" e `MOVIMENTAÇÃO DESTINO` diz "REVISAO DE 6 MESES"). Interpretação aplicada: o veículo
   já foi vendido e voltou pro pátio pra revisão — o campo STATUS não foi atualizado depois da
   venda (dado desatualizado, não um estado novo). O MVP mostra esse veículo em **03 Em Pátio**
   (pelo fallback comercial) mais o evento de pós-venda na tela de detalhe. **Confirmar com a
   operação**: STATUS=ESTOQUE nesses casos é lixo residual, ou tem algum significado operacional
   real que estamos perdendo?

0.4. **2 vendedores novos, reais, não documentados na lista original de 21**: `CARLOS MARANHAO`
   (distinto de `CARLOS` e de `LUIZ CARLOS`) e `FERNANDO` (aparece como "FERNANDO GER.",
   "FERNANDO - PEDIU" em `MOVIMENTAÇÃO BELCAR` — provavelmente gerente de operações, não vendedor
   comercial). Confirmar se `FERNANDO` deveria ser um papel separado (ex.: "solicitante interno")
   em vez de aparecer junto com vendedores.

0.5. **`VALERIA` (grafado assim em `MOVIMENTAÇÃO BELCAR`) foi mesclado com `WALERIA`** (grafia da
   lista oficial) por inferência — mesma pessoa, mesmo padrão de atividade. Confirmar.

## P0 — Bloqueia ou já tem resposta provisória assumida no MVP

1. **USADO, SEMI NOVOS e FUTURA VENDA entram no mesmo pipeline técnico de entrega, ou são
   operação separada (troca/seminovo) fora do escopo da Torre de Controle?**
   Resposta provisória adotada no MVP: entram no funil em 03 Em Pátio com flag `tipo_venda`.
   Precisa confirmação — se for operação separada, essas linhas devem sair do pipeline principal
   e virar um módulo à parte.

2. **VENDA DIRETA segue o mesmo funil de 10 estágios ou pula etapas (ex.: direto pra Entrega,
   sem passar por Preparação/Qualidade)?**
   Resposta provisória: mapeado em 02 Faturado, segue o funil normal. Se a operação real pula
   etapas, R1-R4 precisam de uma variante de fluxo para venda direta.

3. **Não existe status real que mapeie para "04 Verificação de Documentação".**
   A planilha não rastreia essa etapa hoje. Ela é: (a) feita informalmente sem registro, (b) uma
   etapa nova que o sistema deve introduzir do zero, ou (c) redundante e deveria ser removida do
   pipeline-alvo? Isso não pode ser decidido nesta rodada (pipeline é fechado), mas impacta como
   o time vai operar essa etapa no dia 1 do sistema.

4. **REVISAO 6 MESES e REVISAO 1 ANO são pós-venda (depois do Encerrado) ou reabrem o pipeline?**
   Resposta provisória: tratadas como pós-venda, tabela `pos_venda_evento` fora dos 10 estágios.
   Se a operação espera que uma revisão reabra o veículo no funil (ex.: volta pra Preparação),
   o modelo de dados precisa de uma tabela de transição adicional.

5. **NF CANCELADA: o veículo deve voltar automaticamente para "01 Aguardando Faturamento", ou é
   um estado terminal/de exceção que precisa de tratamento manual (ex.: cancelamento de venda)?**
   Resposta provisória: volta para 01 com flag `nf_cancelada = true`, reforçando R1.

## P1 — Não bloqueia o build, mas afeta UX e relatórios

6. **VENDEDORES: confirmar que `LUIS CARLOS` é de fato duplicata de `LUIZ CARLOS`** (e não duas
   pessoas diferentes com nomes parecidos). Assumido como duplicata na seed.

7. **LOCAIS: grafias e destinos a resolver** — `GABARDO RJ` vs `GABARDO SP` vs
   `EM TRANSITO - GABARDO`: qual é o destino final padrão quando o local está genérico
   `EM TRANSITO - GABARDO`? E `PATIO 1`/`PATIO 2` são fisicamente diferentes (prédios/pátios
   distintos) ou apenas numeração de conveniência?

8. **O campo HORA em AGENDA 2026 mistura horário fixo (09:00), bloco (A TARDE, DIA TODO) e faixa
   (08 às 10). Qual formato vale daqui pra frente?**
   Resposta provisória no MVP: campo `hora_raw` (texto livre, mantém o dado histórico) +
   `hora_normalizada` (nullable, preenchido só quando for horário fixo). Recomenda-se padronizar
   para horário fixo de 30/60 min daqui pra frente.

9. **MOTORISTA (aba MOVIMENTAÇÃO BELCAR) é texto livre hoje. Vira cadastro próprio ou continua
   texto livre?**
   Resposta provisória: mantido como texto livre em `movimentacao.motorista` no MVP, sem tabela
   de cadastro — fácil de promover a FK depois se a resposta for "cadastro próprio".

10. **ENTREGA ITUMBIARA é status próprio ou é ENTREGUE mais local Itumbiara?**
    Resposta provisória: tratado como 09 Entregue + flag de local Itumbiara.

11. **ENTREGUE vs ENTREGA ITUMBIARA vs local `CLIENTE`**: quando o veículo chega em 09 Entregue,
    o local final deveria sempre virar `CLIENTE`, mas a planilha às vezes usa `ITUMBIARA` como
    local do status. Confirmar se `ITUMBIARA` é um local de entrega válido (base secundária) ou
    apenas uma rota de transporte.

## P2 — Cosmético / pode esperar

12. **Coluna `TIPO` em ESTOQUE e ESTOQUE SHOWROOM** não tem dicionário de valores documentado —
    levantar lista de valores reais usados antes de modelar como enum.

13. **Colunas sem cabeçalho estrutural claro** (`E`, `R`, `V`, `W` em algumas abas, conforme
    seção 8 da documentação técnica) — revisar se carregam dado relevante ou são resíduo.

14. **Fórmulas de dia da semana em AGENDA 2026** exibem `SÁB.` para linhas sem data (célula vazia
    tratada como data zero). Não afeta o modelo de dados novo, mas indica que linhas "vazias" na
    planilha atual podem estar poluindo contagens históricas usadas para popular a seed real.

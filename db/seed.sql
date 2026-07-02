-- =============================================================================
-- Torre de Controle Belcar — Seed de tabelas de referência + amostra de veículos
-- Valores reais extraídos da auditoria da planilha. Duplicatas marcadas para merge.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- VENDEDORES (21 nomes reais, 1 duplicata conhecida marcada como alias)
-- -----------------------------------------------------------------------------
insert into vendedor (nome, aliases) values
  ('ENEIAS', '{}'),
  ('JORGE', '{}'),
  ('EURIPEDES', '{}'),
  ('LUIZ CLAUDIO', '{}'),
  ('DOUGLAS', '{}'),
  ('GUSTAVO', '{}'),
  ('GUILHERME', '{}'),
  ('MARIANA', '{}'),
  ('RUI', '{}'),
  ('PAULO', '{}'),
  ('CRISTIANO', '{}'),
  ('FRANK', '{}'),
  -- MERGE: 'LUIS CARLOS' é duplicata grafada diferente de 'LUIZ CARLOS' (ver perguntas-negocio.md #6)
  ('LUIZ CARLOS', '{"LUIS CARLOS"}'),
  ('CARLOS', '{}'),
  ('WALERIA', '{}'),
  ('GADMA', '{}'),
  ('DANIELITON', '{}'),
  ('KRISLEY', '{}'),
  ('JOSUE', '{}'),
  ('LAILA', '{}');

-- -----------------------------------------------------------------------------
-- LOCAIS (20 valores reais)
-- -----------------------------------------------------------------------------
insert into local (nome, aliases) values
  ('ANS', '{}'),
  ('AGENDADO', '{}'),
  ('DESTINO', '{}'),
  -- MERGE: local de trânsito genérico, destino final a confirmar (ver perguntas-negocio.md #7)
  ('EM TRANSITO - GABARDO', '{}'),
  ('EXPOSICAO/EVENTO', '{"EXPOSIÇÃO/EVENTO","EXPOSIÇÃO / EVENTO"}'),
  ('FABRICA', '{}'),
  ('FACCHINI', '{}'),
  ('GABARDO RJ', '{}'),
  ('GABARDO SP', '{}'),
  ('HOLMES', '{}'),
  ('IMPLEMENTADOR', '{}'),
  ('ITUMBIARA', '{}'),
  ('JRV', '{}'),
  ('PATIO 1', '{}'),
  ('PATIO 2', '{}'),
  ('REMESSA ANS', '{}'),
  ('SEMI NOVOS', '{}'),
  ('SHOWROOM', '{}'),
  ('MOVIMENTAR', '{}'),
  ('CLIENTE', '{}'),
  ('SEM DESTINO', '{}');

-- -----------------------------------------------------------------------------
-- IMPLEMENTOS (18 valores reais)
-- -----------------------------------------------------------------------------
insert into implemento (nome) values
  ('BAU'),
  ('BAU-JRV'),
  ('BAU-FACCHINI'),
  ('CARROC. FLACH'),
  ('CARROC. JRV'),
  ('CACAMBA-FACCHINI'),
  ('CACAMBA-JRV'),
  ('FLACH'),
  ('NENHUM'),
  ('OUTRO'),
  ('PRANCHA-JRV'),
  ('ROLON OFF'),
  ('SIDER'),
  ('THERMO POINT'),
  ('VAI COLOCAR'),
  ('IMPLEMENTANDO'),
  ('PIPA-JRV'),
  ('PIPA');

-- -----------------------------------------------------------------------------
-- MOTIVOS DE REPROVAÇÃO (catálogo inicial, expandir com uso real)
-- -----------------------------------------------------------------------------
insert into motivo_reprovacao (descricao) values
  ('Avaria na lataria'),
  ('Avaria em implemento'),
  ('Item de acessório faltando'),
  ('Lavagem insatisfatória'),
  ('Documentação divergente'),
  ('Pendência mecânica identificada na inspeção');

-- -----------------------------------------------------------------------------
-- VEÍCULOS DE EXEMPLO — cobrindo todos os 10 estágios e principais flags
-- -----------------------------------------------------------------------------
insert into veiculo (
  chassi, veiculo, cor, cliente, status_atual, responsavel_id, local_atual_id,
  implemento_id, vendedor_id, tipo_venda, nf, data_faturamento, pago, recall_status,
  avariado, pendencia_bateria, pendencia_oficina, nf_cancelada, local_entrega_especial, valor
)
select
  v.chassi, v.veiculo, v.cor, v.cliente, v.status_atual::status_pipeline,
  (select id from vendedor where nome = v.vendedor_nome),
  (select id from local where nome = v.local_nome),
  (select id from implemento where nome = v.implemento_nome),
  (select id from vendedor where nome = v.vendedor_nome),
  v.tipo_venda::tipo_venda, v.nf, v.data_faturamento::date, v.pago, v.recall_status::recall_status,
  v.avariado, v.pendencia_bateria, v.pendencia_oficina, v.nf_cancelada, v.local_entrega_especial, v.valor
from (values
  ('9BW1234500ABC0001','FH 540 6x4','Branco','Transportes Silva Ltda','01_aguardando_faturamento','ENEIAS','FABRICA','SIDER','ENEIAS','padrao',null,null,false,'nao_tem',false,false,null,false,null,480000::numeric),
  ('9BW1234500ABC0002','FM 440 6x2','Vermelho',null,'01_aguardando_faturamento','JORGE','FABRICA','NENHUM','JORGE','padrao',null,null,false,'nao_tem',false,false,null,true,null,395000),
  ('9BW1234500ABC0003','FH 540 6x4','Prata','Log Brasil Cargas','02_faturado','EURIPEDES','PATIO 1','BAU','EURIPEDES','padrao','NF-88213','2026-06-20',true,'nao_tem',false,false,null,false,null,475000),
  ('9BW1234500ABC0004','VM 260','Branco','Comercial Rodotech','02_faturado','MARIANA','PATIO 1','NENHUM','MARIANA','venda_direta','NF-88240','2026-06-25',true,'nao_tem',false,false,null,false,null,290000),
  ('9BW1234500ABC0005','FH 540 6x4','Azul',null,'03_em_patio','RUI','PATIO 2','CARROC. JRV','RUI','padrao',null,null,false,'nao_tem',false,false,null,false,null,470000),
  ('9BW1234500ABC0006','FM 370','Branco',null,'03_em_patio','PAULO','SEMI NOVOS','NENHUM','PAULO','semi_novo',null,null,false,'nao_tem',false,false,null,false,null,210000),
  ('9BW1234500ABC0007','VM 220','Cinza',null,'03_em_patio','CRISTIANO','MOVIMENTAR','NENHUM','CRISTIANO','usado',null,null,false,'nao_tem',false,false,null,false,null,180000),
  ('9BW1234500ABC0008','FH 460 6x2','Branco',null,'03_em_patio','FRANK','PATIO 1','THERMO POINT','FRANK','futura_venda',null,null,false,'nao_tem',false,false,null,false,null,410000),
  ('9BW1234500ABC0009','FMX 500','Vermelho','Distribuidora Nortex','04_verificacao_documentacao','LUIZ CARLOS','PATIO 1','CACAMBA-JRV','LUIZ CARLOS','padrao','NF-88301','2026-06-27',true,'nao_tem',false,false,null,false,null,520000),
  ('9BW1234500ABC0010','FH 540 6x4','Branco','Agro Vale Transportes','05_em_preparacao','CARLOS','JRV','SIDER','CARLOS','padrao','NF-88310','2026-06-27',true,'tem',false,false,null,false,null,485000),
  ('9BW1234500ABC0011','VM 260','Prata','Transportadora Rocha','05_em_preparacao','WALERIA','FACCHINI','BAU-FACCHINI','WALERIA','padrao','NF-88315','2026-06-28',true,'nao_tem',true,false,null,false,null,300000),
  ('9BW1234500ABC0012','FM 440 6x2','Branco','Cliente Beta Log','05_em_preparacao','GADMA','PATIO 2',null,'GADMA','padrao','NF-88320','2026-06-28',false,'nao_tem',false,true,null,false,null,398000),
  ('9BW1234500ABC0013','FH 460 6x2','Azul','Frota Union','05_em_preparacao','DANIELITON','PATIO 1','FLACH','DANIELITON','padrao','NF-88322','2026-06-29',true,'nao_tem',false,false,'falhas',false,null,412000),
  ('9BW1234500ABC0014','FMX 500','Branco','J. Almeida Transportes','05_em_preparacao','KRISLEY','IMPLEMENTADOR','IMPLEMENTANDO','KRISLEY','padrao','NF-88330','2026-06-29',true,'nao_tem',false,false,'parametrizacao',false,null,530000),
  ('9BW1234500ABC0015','VM 220','Branco','Autopeças Sul','06_qualidade','JOSUE','PATIO 1','PIPA-JRV','JOSUE','padrao','NF-88340','2026-06-29',true,'nao_tem',false,false,null,false,null,205000),
  ('9BW1234500ABC0016','FH 540 6x4','Prata','Cargo Master','06_qualidade','LAILA','PATIO 2','SIDER','LAILA','padrao','NF-88345','2026-06-30',true,'realizada',false,false,null,false,null,489000),
  ('9BW1234500ABC0017','FM 370','Branco','Transnova Log','07_liberado','ENEIAS','PATIO 1','BAU-JRV','ENEIAS','padrao','NF-88350','2026-06-30',true,'nao_tem',false,false,null,false,null,415000),
  ('9BW1234500ABC0018','VM 260','Vermelho','J. Almeida Transportes','07_liberado','JORGE','SHOWROOM','NENHUM','JORGE','padrao','NF-88355','2026-06-30',true,'nao_tem',false,false,null,false,null,292000),
  ('9BW1234500ABC0019','FH 460 6x2','Branco','Comercial Rodotech','08_agendado_cliente','EURIPEDES','AGENDADO','THERMO POINT','EURIPEDES','padrao','NF-88360','2026-07-01',true,'nao_tem',false,false,null,false,null,418000),
  ('9BW1234500ABC0020','FMX 500','Azul','Log Brasil Cargas','08_agendado_cliente','MARIANA','AGENDADO','CACAMBA-JRV','MARIANA','padrao','NF-88365','2026-07-01',true,'nao_tem',false,false,null,false,null,525000),
  ('9BW1234500ABC0021','FH 540 6x4','Branco','Transportes Silva Ltda','09_entregue','RUI','CLIENTE','SIDER','RUI','padrao','NF-88101','2026-06-15',true,'nao_tem',false,false,null,false,null,478000),
  ('9BW1234500ABC0022','VM 220','Cinza','Frota Union','09_entregue','PAULO','CLIENTE',null,'PAULO','padrao','NF-88102','2026-06-16',true,'nao_tem',false,false,null,false,'ITUMBIARA',208000),
  ('9BW1234500ABC0023','FM 440 6x2','Branco','Distribuidora Nortex','10_encerrado','CRISTIANO','CLIENTE','BAU','CRISTIANO','padrao','NF-88050','2026-06-01',true,'nao_tem',false,false,null,false,null,400000),
  ('9BW1234500ABC0024','FH 460 6x2','Prata','Agro Vale Transportes','10_encerrado','FRANK','CLIENTE','FLACH','FRANK','padrao','NF-88051','2026-06-02',true,'nao_tem',false,false,null,false,null,422000),
  ('9BW1234500ABC0025','FMX 500','Branco','Cargo Master','10_encerrado','LUIZ CARLOS','CLIENTE','CACAMBA-FACCHINI','LUIZ CARLOS','padrao','NF-88052','2026-06-03',true,'nao_tem',false,false,null,false,null,540000),
  ('9BW1234500ABC0026','VM 260','Azul','Transnova Log','01_aguardando_faturamento','CARLOS','FABRICA','NENHUM','CARLOS','padrao',null,null,false,'nao_tem',false,false,null,false,null,296000),
  ('9BW1234500ABC0027','FH 540 6x4','Branco','Autopeças Sul','02_faturado','WALERIA','PATIO 1','SIDER','WALERIA','padrao','NF-88370','2026-07-01',false,'nao_tem',false,false,null,false,null,480000),
  ('9BW1234500ABC0028','FM 370','Vermelho',null,'03_em_patio','GADMA','PATIO 2','NENHUM','GADMA','padrao',null,null,false,'nao_tem',false,false,null,false,null,405000),
  ('9BW1234500ABC0029','VM 220','Branco','Transportadora Rocha','05_em_preparacao','DANIELITON','PATIO 1','PIPA','DANIELITON','padrao','NF-88375','2026-07-01',true,'em_servico',false,false,null,false,null,207000),
  ('9BW1234500ABC0030','FH 460 6x2','Prata','J. Almeida Transportes','06_qualidade','KRISLEY','PATIO 2','ROLON OFF','KRISLEY','padrao','NF-88380','2026-07-01',true,'nao_tem',false,false,null,false,null,417000)
) as v(chassi, veiculo, cor, cliente, status_atual, vendedor_nome, local_nome, implemento_nome,
       vendedor_nome2, tipo_venda, nf, data_faturamento, pago, recall_status, avariado,
       pendencia_bateria, pendencia_oficina, nf_cancelada, local_entrega_especial, valor);

-- -----------------------------------------------------------------------------
-- HISTÓRICO INICIAL — uma linha de criação por veículo (R4: nunca UPDATE destrutivo)
-- Necessário porque o trigger fn_sync_status_atual só roda em INSERTs futuros;
-- este é o snapshot inicial de migração da planilha legada.
-- -----------------------------------------------------------------------------
insert into status_historico (chassi, status_anterior, status_novo, responsavel_id, motivo_texto)
select chassi, null, status_atual, responsavel_id, 'Migração inicial da planilha legada'
from veiculo;

-- -----------------------------------------------------------------------------
-- FILA DE MOVIMENTAÇÃO — exemplos
-- -----------------------------------------------------------------------------
insert into movimentacao (chassi, prioridade, origem_local_id, destino_local_id, motorista, data_solicitacao)
values
  ('9BW1234500ABC0007','1_hoje',(select id from local where nome='PATIO 1'),(select id from local where nome='CLIENTE'),'Marcos Vieira','2026-07-01'),
  ('9BW1234500ABC0028','4_na_fila',(select id from local where nome='PATIO 2'),(select id from local where nome='SHOWROOM'),null,'2026-07-01'),
  ('9BW1234500ABC0026','8_aguard_pagamento',(select id from local where nome='FABRICA'),(select id from local where nome='PATIO 1'),null,'2026-06-30');

-- -----------------------------------------------------------------------------
-- AGENDA DE ENTREGA — exemplos
-- -----------------------------------------------------------------------------
insert into agenda_entrega (chassi, data, hora_raw, hora_normalizada, vendedor_id, entregador, modalidade, lavado, acessorios, status_agendamento)
values
  ('9BW1234500ABC0019','2026-07-03','09:00','09:00',(select id from vendedor where nome='EURIPEDES'),'Entregador Externo','Retirada no pátio',true,true,'AGENDADO'),
  ('9BW1234500ABC0020','2026-07-04','A TARDE',null,(select id from vendedor where nome='MARIANA'),'Equipe Belcar','Entrega no cliente',true,false,'AGENDADO');

-- -----------------------------------------------------------------------------
-- AGENDA DE ACESSÓRIOS — exemplos
-- -----------------------------------------------------------------------------
insert into agenda_acessorios (chassi, ordem, local_id, vendedor_id, data_agenda, hora_agenda, produtivo, valor, os, descricao_acessorios)
values
  ('9BW1234500ABC0010',1,(select id from local where nome='JRV'),(select id from vendedor where nome='CARLOS'),'2026-07-02','08:00','Equipe JRV',3500,'OS-4021','Kit de fixação + baú lateral'),
  ('9BW1234500ABC0013',2,(select id from local where nome='PATIO 1'),(select id from vendedor where nome='DANIELITON'),'2026-07-02','10:00','Equipe Belcar',1200,'OS-4022','Instalação de rastreador');

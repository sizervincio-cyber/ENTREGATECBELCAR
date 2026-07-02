-- =============================================================================
-- Torre de Controle Belcar — Schema Postgres/Supabase
-- Reconciliação da planilha operacional real com o pipeline-alvo de 10 estágios.
-- Ver docs/de-para-status.md para a justificativa de cada mapeamento.
-- Pronto para rodar em Supabase (Postgres + RLS) sem adaptação manual.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

-- Os 10 estágios do pipeline fechado. status_atual do veículo é SEMPRE um destes
-- valores, nunca um valor bruto da planilha (regra dura do projeto).
create type status_pipeline as enum (
  '01_aguardando_faturamento',
  '02_faturado',
  '03_em_patio',
  '04_verificacao_documentacao',
  '05_em_preparacao',
  '06_qualidade',
  '07_liberado',
  '08_agendado_cliente',
  '09_entregue',
  '10_encerrado'
);

-- Classificação comercial, sempre um flag ao lado do status, nunca um estágio.
-- Ver perguntas-negocio.md #1 e #2 — mapeamento provisório até confirmação do negócio.
create type tipo_venda as enum (
  'padrao',
  'venda_direta',
  'usado',
  'semi_novo',
  'futura_venda'
);

create type recall_status as enum (
  'tem',
  'nao_tem',
  'em_servico',
  'realizada',
  'nao_tem_peca'
);

-- Fila de movimentação (aba MOVIMENTAÇÃO BELCAR), eixo próprio, nunca status principal.
create type prioridade_movimentacao as enum (
  '1_hoje',
  '2_amanha',
  '3_agendado',
  '4_na_fila',
  '5_remessa_ans',
  '6_finalizado',
  '7_onde_esta',
  '8_aguard_pagamento'
);

create type tipo_pos_venda as enum (
  'revisao_6_meses',
  'revisao_1_ano'
);

-- -----------------------------------------------------------------------------
-- TABELAS DE REFERÊNCIA (normalização de duplicatas conhecidas)
-- -----------------------------------------------------------------------------

create table vendedor (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  -- nomes como aparecem na planilha real, incluindo duplicatas grafadas diferente
  -- (ex.: 'LUIS CARLOS' é alias de 'LUIZ CARLOS'). Usado para importar dado legado.
  aliases text[] not null default '{}',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table local (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  aliases text[] not null default '{}',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table implemento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table motivo_reprovacao (
  id uuid primary key default gen_random_uuid(),
  descricao text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- TABELA CENTRAL DE VEÍCULO
-- -----------------------------------------------------------------------------

create table veiculo (
  chassi text primary key,
  veiculo text not null,               -- modelo/versão
  cor text,
  cliente text,

  status_atual status_pipeline not null default '01_aguardando_faturamento',
  responsavel_id uuid references vendedor(id),  -- R2: obrigatório antes de avançar etapa
  local_atual_id uuid references local(id),
  implemento_id uuid references implemento(id),
  vendedor_id uuid references vendedor(id),

  tipo_venda tipo_venda not null default 'padrao',

  -- R1: gate bloqueante — não sai de 01 sem NF e data de faturamento
  nf text,
  data_faturamento date,
  data_faturamento_fabrica date,

  pago boolean not null default false,
  recall_status recall_status not null default 'nao_tem',

  -- flags de bloqueio/exceção paralela — nunca status principal (ver DE-PARA)
  avariado boolean not null default false,
  pendencia_bateria boolean not null default false,
  pendencia_oficina text,              -- 'falhas' | 'parametrizacao' | null
  nf_cancelada boolean not null default false,
  local_entrega_especial text,         -- ex.: 'ITUMBIARA' (ver pergunta de negócio #10/#11)

  valor numeric(14,2),
  observacoes text,
  observacoes_complementares text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_veiculo_status on veiculo(status_atual);
create index idx_veiculo_vendedor on veiculo(vendedor_id);
create index idx_veiculo_local on veiculo(local_atual_id);

-- -----------------------------------------------------------------------------
-- HISTÓRICO DE STATUS (R4: todo evento é uma linha nova, nunca UPDATE destrutivo)
-- -----------------------------------------------------------------------------

create table status_historico (
  id uuid primary key default gen_random_uuid(),
  chassi text not null references veiculo(chassi) on delete cascade,
  status_anterior status_pipeline,
  status_novo status_pipeline not null,
  responsavel_id uuid references vendedor(id),
  -- R3: reprovação em 06 volta pra 05 com motivo obrigatório
  motivo_reprovacao_id uuid references motivo_reprovacao(id),
  motivo_texto text,
  created_at timestamptz not null default now()
);

create index idx_status_historico_chassi on status_historico(chassi, created_at);

-- Trigger: garante R3 no banco — reprovação (06 -> 05) exige motivo.
create or replace function fn_exige_motivo_reprovacao()
returns trigger as $$
begin
  if new.status_anterior = '06_qualidade' and new.status_novo = '05_em_preparacao' then
    if new.motivo_reprovacao_id is null and (new.motivo_texto is null or new.motivo_texto = '') then
      raise exception 'R3: reprovacao em 06 Qualidade exige motivo obrigatorio';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_exige_motivo_reprovacao
  before insert on status_historico
  for each row execute function fn_exige_motivo_reprovacao();

-- Trigger: mantém veiculo.updated_at e sincroniza status_atual a partir do histórico.
create or replace function fn_sync_status_atual()
returns trigger as $$
begin
  update veiculo
    set status_atual = new.status_novo,
        updated_at = now()
    where chassi = new.chassi;
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_status_atual
  after insert on status_historico
  for each row execute function fn_sync_status_atual();

-- -----------------------------------------------------------------------------
-- FILA DE MOVIMENTAÇÃO (eixo próprio, ligado por CHASSI, separado do status principal)
-- -----------------------------------------------------------------------------

create table movimentacao (
  id uuid primary key default gen_random_uuid(),
  chassi text not null references veiculo(chassi) on delete cascade,
  prioridade prioridade_movimentacao not null,
  origem_local_id uuid references local(id),
  destino_local_id uuid references local(id),
  motorista text,                      -- texto livre hoje (ver pergunta de negócio #9)
  data_solicitacao date not null default current_date,
  data_retirada date,
  data_chegada date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_movimentacao_chassi on movimentacao(chassi);
create index idx_movimentacao_prioridade on movimentacao(prioridade);

-- -----------------------------------------------------------------------------
-- AGENDA DE ENTREGA E AGENDA DE ACESSÓRIOS
-- -----------------------------------------------------------------------------

create table agenda_entrega (
  id uuid primary key default gen_random_uuid(),
  chassi text not null references veiculo(chassi) on delete cascade,
  data date not null,
  -- hora mista na planilha real (fixa, bloco ou faixa) — ver pergunta de negócio #8
  hora_raw text,
  hora_normalizada time,
  vendedor_id uuid references vendedor(id),
  entregador text,
  modalidade text,
  lavado boolean not null default false,
  acessorios boolean not null default false,
  status_agendamento text,
  obs_pos_entrega text,
  created_at timestamptz not null default now()
);

create index idx_agenda_entrega_chassi on agenda_entrega(chassi);
create index idx_agenda_entrega_data on agenda_entrega(data);

create table agenda_acessorios (
  id uuid primary key default gen_random_uuid(),
  chassi text not null references veiculo(chassi) on delete cascade,
  ordem integer,
  local_id uuid references local(id),
  vendedor_id uuid references vendedor(id),
  data_agenda date,
  hora_agenda text,
  produtivo text,
  valor numeric(14,2),
  os text,
  descricao_acessorios text,
  created_at timestamptz not null default now()
);

create index idx_agenda_acessorios_chassi on agenda_acessorios(chassi);

-- -----------------------------------------------------------------------------
-- PÓS-VENDA (ocorre depois do estágio 10 Encerrado — fora do pipeline técnico)
-- -----------------------------------------------------------------------------

create table pos_venda_evento (
  id uuid primary key default gen_random_uuid(),
  chassi text not null references veiculo(chassi) on delete cascade,
  tipo tipo_pos_venda not null,
  data_evento date,
  status text,
  observacoes text,
  created_at timestamptz not null default now()
);

create index idx_pos_venda_chassi on pos_venda_evento(chassi);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- MVP: acesso liberado para qualquer usuário autenticado (ferramenta interna).
-- Refinar por papel (vendedor/gestor/oficina) quando Auth entrar em produção.
-- -----------------------------------------------------------------------------

alter table vendedor enable row level security;
alter table local enable row level security;
alter table implemento enable row level security;
alter table motivo_reprovacao enable row level security;
alter table veiculo enable row level security;
alter table status_historico enable row level security;
alter table movimentacao enable row level security;
alter table agenda_entrega enable row level security;
alter table agenda_acessorios enable row level security;
alter table pos_venda_evento enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'vendedor','local','implemento','motivo_reprovacao','veiculo',
    'status_historico','movimentacao','agenda_entrega','agenda_acessorios','pos_venda_evento'
  ]
  loop
    execute format(
      'create policy %I_authenticated_all on %I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

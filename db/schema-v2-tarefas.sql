-- =============================================================================
-- Torre de Controle Belcar v2 — módulo de Tarefas (extensão de db/schema.sql)
-- Roda depois de db/schema.sql. Ver docs/v2-torre-de-controle/02-modelo-dados.md
-- =============================================================================

create type tarefa_categoria as enum (
  'lavagem','acessorio','implemento','os','recall','bateria','avaria',
  'oficina_falhas','oficina_parametrizacao','documentacao','qualidade',
  'faturamento','outro'
);

create type tarefa_status as enum ('a_fazer','em_andamento','bloqueada','concluida');
create type tarefa_prioridade as enum ('baixa','media','alta','critica');
create type tarefa_anexo_tipo as enum ('documento','imagem','audio');

create table tarefa (
  id uuid primary key default gen_random_uuid(),
  chassi text not null references veiculo(chassi) on delete cascade,
  titulo text not null,
  descricao text,
  categoria tarefa_categoria not null default 'outro',
  responsavel_id uuid references vendedor(id),        -- R2 estendida: sem responsável, não avança pra 'em_andamento'
  status tarefa_status not null default 'a_fazer',
  prioridade tarefa_prioridade not null default 'media',
  prazo date,
  concluida_em timestamptz,
  valor numeric(14,2),
  motivo_bloqueio text,
  fase_pipeline status_pipeline,
  gerada_automaticamente boolean not null default false,
  criada_por uuid references vendedor(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tarefa_chassi on tarefa(chassi);
create index idx_tarefa_responsavel on tarefa(responsavel_id, status);
create index idx_tarefa_status on tarefa(status) where status <> 'concluida';

-- R5: bloqueia em_andamento sem responsável / R7: bloqueia 'bloqueada' sem motivo
create or replace function fn_tarefa_exige_responsavel()
returns trigger as $$
begin
  if new.status = 'em_andamento' and new.responsavel_id is null then
    raise exception 'R5: tarefa nao pode ir para em_andamento sem responsavel';
  end if;
  if new.status = 'bloqueada' and (new.motivo_bloqueio is null or new.motivo_bloqueio = '') then
    raise exception 'R7: tarefa bloqueada exige motivo_bloqueio';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_tarefa_exige_responsavel
  before insert or update on tarefa
  for each row execute function fn_tarefa_exige_responsavel();

create table tarefa_checklist_item (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references tarefa(id) on delete cascade,
  texto text not null,
  feito boolean not null default false,
  ordem integer not null default 0,
  feito_em timestamptz,
  feito_por uuid references vendedor(id)
);

create index idx_checklist_tarefa on tarefa_checklist_item(tarefa_id, ordem);

create table tarefa_anexo (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references tarefa(id) on delete cascade,
  tipo tarefa_anexo_tipo not null,
  nome text not null,
  url text not null,
  tamanho_bytes integer,
  mime_type text,
  enviado_por uuid references vendedor(id),
  enviado_em timestamptz not null default now()
);

create index idx_anexo_tarefa on tarefa_anexo(tarefa_id);

create table tarefa_comentario (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references tarefa(id) on delete cascade,
  autor_id uuid references vendedor(id),
  texto text not null,
  created_at timestamptz not null default now()
);

create index idx_comentario_tarefa on tarefa_comentario(tarefa_id, created_at);

-- append-only, nunca UPDATE — mesmo padrão de status_historico (R4/R8)
create table tarefa_historico (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references tarefa(id) on delete cascade,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  autor_id uuid references vendedor(id),
  created_at timestamptz not null default now()
);

create index idx_historico_tarefa on tarefa_historico(tarefa_id, created_at);

-- RLS (mesmo padrão do schema.sql: liberado pra autenticado no MVP)
alter table tarefa enable row level security;
alter table tarefa_checklist_item enable row level security;
alter table tarefa_anexo enable row level security;
alter table tarefa_comentario enable row level security;
alter table tarefa_historico enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tarefa','tarefa_checklist_item','tarefa_anexo','tarefa_comentario','tarefa_historico']
  loop
    execute format(
      'create policy %I_authenticated_all on %I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

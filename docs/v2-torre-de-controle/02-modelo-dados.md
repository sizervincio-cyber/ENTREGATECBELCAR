# 02 · Modelo de Dados — Torre de Controle v2

Este documento **estende** `db/schema.sql` (já fechado e rodando com dados reais). Não altera
nenhuma tabela existente — só adiciona as entidades do módulo de Tarefas, inspiradas
diretamente em `Task`/`TaskAttachment`/`TaskComment` do sistema de referência, mas com
`chassi` no lugar de `project_id`.

## Entidades Existentes (não mudam — referência rápida)

```
veiculo (PK chassi)
  └── status_historico (1:n)      — R4, append-only
  └── movimentacao (1:n)          — fila própria
  └── agenda_entrega (1:n)
  └── agenda_acessorios (1:n)
  └── pos_venda_evento (1:n)
vendedor, local, implemento, motivo_reprovacao — tabelas de referência
```

## Entidades Novas

```
veiculo (PK chassi)
  └── tarefa (1:n)                       ← NOVO
        └── tarefa_checklist_item (1:n)  ← NOVO
        └── tarefa_anexo (1:n)           ← NOVO
        └── tarefa_comentario (1:n)      ← NOVO
        └── tarefa_historico (1:n)       ← NOVO, append-only (R4 aplicado à tarefa)
```

### Entidade: `tarefa`

```typescript
Tarefa {
  id:               uuid (PK)
  chassi:           text (FK → veiculo, obrigatório)
  titulo:           text
  descricao:        text?
  categoria:        enum('lavagem','acessorio','implemento','os','recall','bateria',
                         'avaria','oficina_falhas','oficina_parametrizacao',
                         'documentacao','qualidade','faturamento','outro')
  responsavel_id:   uuid? (FK → vendedor)   // "vendedor" hoje é a tabela de pessoas;
                                             // ver pergunta de negócio sobre renomear
                                             // pra "pessoa"/"colaborador" quando tarefas
                                             // passarem a ser atribuídas a produtivos
                                             // que não são vendedores (ex.: BIGODINHO)
  status:           enum('a_fazer','em_andamento','bloqueada','concluida')
  prioridade:       enum('baixa','media','alta','critica')
  prazo:            date?
  concluida_em:     timestamp?
  valor:            numeric(14,2)?          // custo da tarefa (ex.: acessório, OS)
  motivo_bloqueio:  text?                   // obrigatório quando status = 'bloqueada'
  fase_pipeline:    status_pipeline?        // em qual estágio do pipeline esta tarefa nasceu
  gerada_automaticamente: boolean default false  // ex.: "Emitir NF" ao entrar em 01
  criada_por:       uuid? (FK → vendedor)
  created_at:       timestamp
  updated_at:       timestamp
}
```

### Entidade: `tarefa_checklist_item`

```typescript
TarefaChecklistItem {
  id:          uuid (PK)
  tarefa_id:   uuid (FK → tarefa)
  texto:       text
  feito:       boolean default false
  ordem:       integer
  feito_em:    timestamp?
  feito_por:   uuid? (FK → vendedor)
}
```

### Entidade: `tarefa_anexo`

```typescript
TarefaAnexo {
  id:            uuid (PK)
  tarefa_id:     uuid (FK → tarefa)
  tipo:          enum('documento','imagem','audio')
  nome:          text
  url:           text            // Supabase Storage path
  tamanho_bytes: integer?
  mime_type:     text?
  enviado_por:   uuid? (FK → vendedor)
  enviado_em:    timestamp
}
```

### Entidade: `tarefa_comentario`

```typescript
TarefaComentario {
  id:          uuid (PK)
  tarefa_id:   uuid (FK → tarefa)
  autor_id:    uuid? (FK → vendedor)
  texto:       text
  created_at:  timestamp
}
```

### Entidade: `tarefa_historico`

```typescript
TarefaHistorico {
  id:            uuid (PK)
  tarefa_id:     uuid (FK → tarefa)
  campo:         text          // 'status' | 'responsavel_id' | 'prazo' | 'valor' | ...
  valor_anterior: text?
  valor_novo:    text?
  autor_id:      uuid? (FK → vendedor)
  created_at:    timestamp
}
```

## DDL Delta (Postgres/Supabase — roda depois de `db/schema.sql`)

```sql
-- =============================================================================
-- Torre de Controle Belcar v2 — módulo de Tarefas (extensão de db/schema.sql)
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

-- R2 estendida: bloqueia em_andamento sem responsável
create or replace function fn_tarefa_exige_responsavel()
returns trigger as $$
begin
  if new.status = 'em_andamento' and new.responsavel_id is null then
    raise exception 'R2: tarefa nao pode ir para em_andamento sem responsavel';
  end if;
  if new.status = 'bloqueada' and (new.motivo_bloqueio is null or new.motivo_bloqueio = '') then
    raise exception 'Tarefa bloqueada exige motivo_bloqueio';
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

-- append-only, nunca UPDATE — mesmo padrão de status_historico (R4)
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
```

## Tarefas Automáticas (regra de negócio, não obrigatória — ver perguntas pendentes)

Quando um veículo entra em determinados estágios, o sistema pode criar tarefas automaticamente
para reduzir o trabalho manual de abrir tarefa uma a uma:

| Evento | Tarefa criada automaticamente | Categoria |
|---|---|---|
| Veículo criado em `01_aguardando_faturamento` | "Emitir NF e definir data de faturamento" | `faturamento` |
| Veículo avança para `05_em_preparacao` | "Lavar veículo" | `lavagem` |
| Veículo avança para `05_em_preparacao` e tem `recall_status IN ('tem','em_servico')` | "Executar recall/campanha" | `recall` |
| Veículo reprovado em `06_qualidade` | Tarefa com o motivo da reprovação, já em `05_em_preparacao` | `qualidade` |
| `agenda_acessorios` tem linha para o chassi | Tarefa espelhando a instalação, com `valor` copiado | `acessorio` |

Isso é **proposta de design**, não regra dura — precisa validação do time de operação antes
de ativar (ver `07-perguntas-negocio.md`).

## Regras de Negócio — Dados (novas, análogas às RN-D do sistema de referência)

| Regra | Descrição |
|---|---|
| RN-D-01 | Toda tarefa pertence a exatamente um veículo (`chassi` obrigatório, nunca solta) |
| RN-D-02 | Tarefa não pode ir para `em_andamento` sem `responsavel_id` (trigger `fn_tarefa_exige_responsavel`) |
| RN-D-03 | Tarefa não pode ir para `bloqueada` sem `motivo_bloqueio` |
| RN-D-04 | `tarefa_historico` é append-only — toda mudança de campo relevante (status, responsável, prazo, valor) gera uma linha, nunca sobrescreve |
| RN-D-05 | Exclusão de tarefa é lógica (soft: `status` não tem valor "excluída" hoje — proposta: adicionar se o negócio pedir) |
| RN-D-06 | O checklist de uma tarefa não bloqueia o status da tarefa — é informativo (% de conclusão), quem bloqueia é o campo `status` |
| RN-D-07 | 06 Qualidade só libera pro 07 quando não existem tarefas com `status IN ('a_fazer','em_andamento','bloqueada')` marcadas como bloqueantes daquele veículo (ver definição de "bloqueante" em `03-pipeline-regras.md`) |

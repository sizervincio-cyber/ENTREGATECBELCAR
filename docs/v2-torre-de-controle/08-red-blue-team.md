# 08 · Red Team e Blue Team — Módulo de Tarefas + Redesenho v2

## RED TEAM — Riscos e Críticas

### Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Volume de tarefas automáticas explode o dataset** | Alta, se as tarefas automáticas de `02-modelo-dados.md` forem ativadas sem critério | Médio | Manter desligado até validação (já refletido em `06-backlog-fases.md`, Fora do MVP) |
| **`tarefa.responsavel_id` apontando pra `vendedor` é semanticamente errado** | Certa (já é assim no design proposto) | Médio (dívida técnica, não funcional) | Documentado como P0-1 em `07-perguntas-negocio.md`; migração pra tabela `pessoa` fica pronta pra rodar depois sem reescrever a UI (troca só a FK) |
| **Kanban de Tarefas com ~1000+ cards reais trava o drag-and-drop** | Média | Alto | Reusar o padrão já validado no `KanbanBoard.tsx` do pipeline: `CARDS_PER_COLUMN` com link "ver todos" |
| **Upload de anexo (imagem/áudio) sem backend real** | Certa no MVP local | Baixo (é mock) | Mesma estratégia do MVP v1: mock local com `URL.createObjectURL`, trocar por Supabase Storage quando o backend real entrar |
| **Trigger de banco (`fn_tarefa_exige_responsavel`) e validação client-side divergindo** | Média | Médio | A mesma regra precisa estar espelhada em `app/src/lib/rules.ts` (client) e no trigger SQL (servidor) — já é o padrão usado pra R1-R4, replicar |

### Riscos de UX

| Risco | Descrição | Correção |
|---|---|---|
| **Tela do veículo com 6 abas fica pesada** | Carregar tudo de uma vez (tarefas + movimentação + agenda + histórico) pode ficar lento com 1.642 veículos no dataset | Lazy load por aba — só busca dados da aba ativa, igual ao padrão de rota já usado no resto do app |
| **Confusão entre "Tarefa do veículo" e "próxima ação obrigatória"** | Usuário pode achar que toda tarefa aberta bloqueia o pipeline | UI precisa deixar claro visualmente quais tarefas são bloqueantes (badge diferenciado) vs informativas — ver tabela de decisão em `03-pipeline-regras.md` |
| **Dashboard com 14 KPIs perde foco** | Mesmo risco identificado no sistema de referência pro dashboard deles | Hierarquia visual: 4-5 KPIs em destaque (total, sem responsável, SLA vencido, bloqueio crítico), resto em seção secundária |
| **Kanban de Tarefas duplica conceito do Kanban de Pipeline** | Usuário pode confundir os dois boards | Cores e contexto diferentes: Pipeline usa cor de fase (cinza/âmbar/verde), Tarefas usa cor de prioridade (mesmo padrão do sistema de referência) — nomear claramente "Pipeline" vs "Tarefas" na sidebar |

### Riscos de Escopo (Feature Creep)

| Feature | Por que deve ficar fora desta rodada |
|---|---|
| Tarefas automáticas ativadas por padrão | Precisa validação de negócio antes — risco de gerar ruído (ver P0-3) |
| Checklist padrão por categoria | Precisa confirmar se os itens realmente se repetem entre veículos |
| App mobile pro produtivo | Mudança de plataforma inteira, V2 |
| Notificação de tarefa vencida por e-mail/WhatsApp | Precisa infra de envio, fora de escopo front-only |
| Multi-perfil de permissão (quem pode criar/editar/excluir tarefa) | MVP continua sem autenticação real — permissão é decisão de V1 junto com login |

### Riscos de Produto

| Risco | Descrição |
|---|---|
| **Sistema vira "reprodução da planilha com abas bonitas"** | Se as tarefas não tiverem de fato responsável+prazo+evidência preenchidos na prática, o módulo vira só mais um campo de texto livre. Mitigação: tornar o preenchimento rápido (poucos cliques), não burocrático |
| **Achar que o módulo de Tarefas substitui o pipeline principal** | Não substitui — é complementar. Reforçar na documentação e na UI que o status do veículo sempre é um dos 10 estágios, tarefa é o "como chegar lá" |
| **Task genérico demais, perde o contexto de caminhão** | Diferente do sistema de referência (tarefas de projeto de software), aqui cada tarefa É sobre um objeto físico. Reforçar chassi/modelo/cliente sempre visível no card e no drawer |

---

## BLUE TEAM — Melhorias e Solução Corrigida

### Decisões de Produto Recomendadas

| Decisão | Recomendação | Por quê |
|---|---|---|
| **Responsável de tarefa** | Reaproveitar `vendedor` nesta rodada (renomear pra `pessoa` fica pra quando o time confirmar a necessidade — ver P0-1) | Evita migração de schema especulativa antes de confirmar o modelo de papéis real |
| **Tarefas automáticas** | Implementar a lógica, mas com flag `gerada_automaticamente` e desligada por padrão — permite ativar por categoria conforme validação | Reduz risco de ruído sem perder o trabalho de implementação |
| **Categorias bloqueantes** | Usar a lista proposta em `03-pipeline-regras.md` como default, mas tornar configurável (tabela `tarefa_categoria_bloqueante` ou array em config) em vez de hardcoded, já prevendo que a resposta de negócio pode mudar | Menos retrabalho quando a pergunta de negócio #2 for respondida |
| **Anexos** | Supabase Storage desde já (não reinventar link de Drive) | Mais simples de implementar e testar no MVP, sem dependência de conta Google externa |
| **Upload de áudio (evidência falada)** | Manter no MVP — é barato de implementar (já existe padrão pronto no `TaskDrawer.tsx` de referência) e é um diferencial real pra equipe de pátio que prefere falar a digitar | Baixo custo, alto valor percebido |

### Simplificações Inteligentes para esta rodada

| Feature | Simplificação | Impacto |
|---|---|---|
| Checklist de tarefa | Texto livre, sem template por categoria | Remove necessidade de configuração prévia |
| Responsável de tarefa | Reusa `vendedor` | Remove necessidade de nova tabela agora |
| Anexos | Upload básico, sem preview/versionamento | Remove complexidade de visualizador de arquivo |
| Relatórios | 3 fixos + CSV | Remove builder customizado |
| Permissão | Nenhuma (mesma política aberta do MVP v1) | Remove necessidade de RBAC antes de ter login real |

### Priorização (ordem de implementação recomendada)

```
1. Schema + seed de Tarefas                    (fundação de dados)
2. Kanban + Drawer de Tarefas                   (maior valor percebido, "mínimo mágico")
3. Tela do Veículo como mini-ambiente           (junta tudo que já existe + Tarefas)
4. Dashboard Geral expandido                    (consolida a visão executiva)
5. Telas que faltam (Faturamento, Acessórios, Entregues, Cadastros)
6. Relatórios + polish visual                   (prova de valor pra gestão)
```

Mesma lógica do sistema de referência: entregar o "mínimo mágico" (tarefas + veículo) antes
de telas administrativas — o usuário sente o valor do produto antes de mexer em relatório ou
cadastro.

### Melhorias de UX que custam pouco e valem muito

| Melhoria | Implementação | Impacto |
|---|---|---|
| Badge diferenciado pra tarefa bloqueante vs informativa | Cor/ícone distinto no card da tarefa | Reduz confusão sobre o que trava a entrega |
| Atalho de teclado pra nova tarefa (`T`) | Mesmo padrão do sistema de referência (`N`, `P`) | Eficiência pra quem usa muito |
| Contador de tarefas abertas no header da aba do veículo | Badge numérico na aba "Tarefas" | Visibilidade sem precisar clicar |
| Confirmação antes de fechar drawer com comentário não enviado | Já é padrão no `TaskDrawer.tsx` de referência, replicar 1:1 | Evita perda de dado digitado |

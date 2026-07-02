# 07 · Perguntas de Negócio Pendentes — v2 (módulo de Tarefas)

Complementa `docs/perguntas-negocio.md` (que trata da reconciliação de dados v1 — gap de
`PROGRAMAÇÃO`/`ESTOQUE SHOWROOM`, já resolvido, duplicatas de vendedor/local, etc.). Este
documento só lista perguntas **novas**, geradas pelo desenho do módulo de Tarefas.

## P0 — Bloqueia a Fase B/C do backlog

1. **Quem pode ser "responsável" de uma tarefa?** Hoje `tarefa.responsavel_id` aponta pra
   `vendedor` (mesma tabela usada em todo o schema v1). Mas tarefas de preparação são
   normalmente feitas por produtivos/equipe de oficina (ex.: "BIGODINHO", visto nos dados
   reais de `AGENDA DE ACESSÓRIOS.csv`), não por vendedores. **Decisão necessária**: criar
   uma tabela `pessoa`/`colaborador` separada de `vendedor` (mais correto, mas é mudança de
   schema maior), ou continuar usando `vendedor` como "qualquer pessoa que pode ser
   responsável" (mais rápido, mas nome errado)? Resposta provisória adotada nesta rodada:
   reaproveitar `vendedor` como tabela genérica de responsáveis, mas isso é dívida técnica —
   o nome da tabela vai ficar semanticamente errado.

2. **Quais categorias de tarefa realmente bloqueiam a passagem de 06 Qualidade para 07
   Liberado?** A tabela em `03-pipeline-regras.md` é uma proposta razoável (recall, avaria,
   oficina, documentação, qualidade bloqueiam; lavagem, acessório, outro não bloqueiam) mas
   precisa confirmação do time de operação — especialmente **acessório**: se o cliente pagou
   por um acessório específico como condição da venda, a entrega não deveria sair sem ele.

3. **Tarefas automáticas devem ser ativadas?** A lista de gatilhos em `02-modelo-dados.md`
   (ex.: criar tarefa "Lavar veículo" automaticamente ao entrar em Preparação) economiza
   trabalho manual, mas pode gerar ruído se a operação já tem outro jeito de saber que precisa
   lavar. Precisa decisão explícita antes de ativar — proposta é começar **desligado** e ligar
   depois de validar com o time.

## P1 — Não bloqueia o build, mas afeta a UX

4. **Checklist de tarefa é um texto livre criado na hora, ou existe um checklist padrão por
   categoria?** Ex.: toda tarefa de categoria `qualidade` deveria vir com um checklist padrão
   ("verificar pintura", "verificar pneus", "verificar documentação")? Resposta provisória:
   texto livre no MVP, checklist padrão por categoria fica pra V1 se a operação confirmar que
   os itens se repetem.

5. **Anexo de tarefa vai pra onde?** O sistema de referência salva em pasta do Google Drive do
   projeto. Belcar não tem essa estrutura hoje. Proposta: Supabase Storage por tarefa
   (`tarefa_anexo.url` aponta pro Storage). Precisa confirmar se a operação quer manter
   compatibilidade com o Google Drive que já usam pra outras coisas (mencionado no zip de
   referência) ou se aceita migrar pro Storage do Supabase.

6. **"Valor" da tarefa é custo interno (o que a Belcar gasta) ou preço cobrado do cliente?**
   Nos dados reais de `AGENDA DE ACESSÓRIOS.csv`, o campo `VALOR` mistura os dois sentidos
   (ex.: "CORTESIA", "EXTERNO", valores em R$) sem padronização. Precisa decisão de negócio:
   `tarefa.valor` representa custo, preço, ou os dois campos separados (`custo` e
   `preco_cobrado`)? Resposta provisória: um campo único `valor`, tratado como "valor
   associado à tarefa" sem distinguir — mais fiel ao dado real, menos preciso analiticamente.

7. **SLA por fase — qual é o limiar de dias que conta como "vencido"?** O MVP v1 usa 5 dias
   fixo pra todas as fases no Dashboard. Provavelmente cada fase deveria ter um SLA diferente
   (ex.: Aguardando Faturamento pode levar mais tempo que Em Preparação). Precisa números reais
   da operação.

## P2 — Cosmético / pode esperar

8. **Card do veículo (`VeiculoCardPremium`) precisa de foto do caminhão?** O sistema de
   referência usa logo do projeto. Belcar não tem fotos de veículo no dataset atual — usar
   ícone genérico por enquanto, ou é importante ter foto real pra reconhecimento visual rápido
   no pátio?

9. **Nome das rotas em português sem acento (`/agenda-acessorios`) versus com acento
   (`/agenda-acessórios`)** — decisão puramente técnica, mantém sem acento por segurança de
   URL, mas vale confirmar que não há preferência de branding.

// Espelha db/schema.sql. Ao trocar a camada de dados mock por Supabase real,
// estes tipos devem continuar batendo com o schema gerado (supabase gen types).

export const PIPELINE_STAGES = [
  "01_aguardando_faturamento",
  "02_faturado",
  "03_em_patio",
  "04_verificacao_documentacao",
  "05_em_preparacao",
  "06_qualidade",
  "07_liberado",
  "08_agendado_cliente",
  "09_entregue",
  "10_encerrado",
] as const;

export type StatusPipeline = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<StatusPipeline, string> = {
  "01_aguardando_faturamento": "Aguardando Faturamento",
  "02_faturado": "Faturado",
  "03_em_patio": "Em Pátio",
  "04_verificacao_documentacao": "Verificação de Documentação",
  "05_em_preparacao": "Em Preparação",
  "06_qualidade": "Qualidade",
  "07_liberado": "Liberado",
  "08_agendado_cliente": "Agendado Cliente",
  "09_entregue": "Entregue",
  "10_encerrado": "Encerrado",
};

export type Fase = "fluxo_interno" | "controle" | "entrega";

export const STAGE_FASE: Record<StatusPipeline, Fase> = {
  "01_aguardando_faturamento": "fluxo_interno",
  "02_faturado": "fluxo_interno",
  "03_em_patio": "fluxo_interno",
  "04_verificacao_documentacao": "controle",
  "05_em_preparacao": "controle",
  "06_qualidade": "controle",
  "07_liberado": "controle",
  "08_agendado_cliente": "entrega",
  "09_entregue": "entrega",
  "10_encerrado": "entrega",
};

export const FASE_LABELS: Record<Fase, string> = {
  fluxo_interno: "Fluxo Interno",
  controle: "Controle",
  entrega: "Entrega",
};

export type TipoVenda = "padrao" | "venda_direta" | "usado" | "semi_novo" | "futura_venda";

export const TIPO_VENDA_LABELS: Record<TipoVenda, string> = {
  padrao: "Padrão",
  venda_direta: "Venda Direta",
  usado: "Usado",
  semi_novo: "Semi Novo",
  futura_venda: "Futura Venda",
};

export type RecallStatus = "tem" | "nao_tem" | "em_servico" | "realizada" | "nao_tem_peca";

export const RECALL_LABELS: Record<RecallStatus, string> = {
  tem: "Tem",
  nao_tem: "Não Tem",
  em_servico: "Em Serviço",
  realizada: "Realizada",
  nao_tem_peca: "Não Tem Peça",
};

export type PrioridadeMovimentacao =
  | "1_hoje"
  | "2_amanha"
  | "3_agendado"
  | "4_na_fila"
  | "5_remessa_ans"
  | "6_finalizado"
  | "7_onde_esta"
  | "8_aguard_pagamento";

export const PRIORIDADE_LABELS: Record<PrioridadeMovimentacao, string> = {
  "1_hoje": "Hoje",
  "2_amanha": "Amanhã",
  "3_agendado": "Agendado",
  "4_na_fila": "Na Fila",
  "5_remessa_ans": "Remessa ANS",
  "6_finalizado": "Finalizado",
  "7_onde_esta": "Onde Está?",
  "8_aguard_pagamento": "Aguard. Pagamento",
};

export const PRIORIDADE_ORDER: PrioridadeMovimentacao[] = [
  "1_hoje",
  "2_amanha",
  "3_agendado",
  "4_na_fila",
  "5_remessa_ans",
  "7_onde_esta",
  "8_aguard_pagamento",
  "6_finalizado",
];

export interface Vendedor {
  id: string;
  nome: string;
  aliases: string[];
  ativo: boolean;
}

export interface Local {
  id: string;
  nome: string;
  aliases: string[];
  ativo: boolean;
}

export interface Implemento {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface MotivoReprovacao {
  id: string;
  descricao: string;
  ativo: boolean;
}

export interface Veiculo {
  chassi: string;
  veiculo: string;
  cor: string | null;
  cliente: string | null;

  statusAtual: StatusPipeline;
  responsavelId: string | null;
  localAtualId: string | null;
  implementoId: string | null;
  vendedorId: string | null;

  tipoVenda: TipoVenda;

  nf: string | null;
  dataFaturamento: string | null;
  dataFaturamentoFabrica: string | null;

  pago: boolean;
  recallStatus: RecallStatus;

  avariado: boolean;
  pendenciaBateria: boolean;
  pendenciaOficina: "falhas" | "parametrizacao" | null;
  nfCancelada: boolean;
  localEntregaEspecial: string | null;

  valor: number | null;
  observacoes: string | null;

  // Controle financeiro da nota (editável no Modo Planilha). Opcionais porque
  // o seed real importado da planilha não tem esses campos.
  custoNotaEntrada?: number | null;
  valorNotaSaida?: number | null;

  createdAt: string;
  updatedAt: string;
}

export interface StatusHistorico {
  id: string;
  chassi: string;
  statusAnterior: StatusPipeline | null;
  statusNovo: StatusPipeline;
  responsavelId: string | null;
  motivoReprovacaoId: string | null;
  motivoTexto: string | null;
  createdAt: string;
}

// Como o veículo se moveu: rodando (na própria roda, gera km) ou de cegonha.
export type ModalidadeTransporte = "rodando" | "cegonha";

export const MODALIDADE_TRANSPORTE_LABELS: Record<ModalidadeTransporte, string> = {
  rodando: "Rodando",
  cegonha: "Cegonha",
};

export interface Movimentacao {
  id: string;
  chassi: string;
  prioridade: PrioridadeMovimentacao;
  origemLocalId: string | null;
  destinoLocalId: string | null;
  motorista: string | null;
  dataSolicitacao: string;
  dataRetirada: string | null;
  dataChegada: string | null;
  observacoes: string | null;
  // Controle de km e forma de transporte. Opcionais: o histórico importado da
  // planilha não tem esses campos.
  km?: number | null;
  modalidadeTransporte?: ModalidadeTransporte | null;
}

export interface AgendaEntrega {
  id: string;
  chassi: string;
  data: string;
  horaRaw: string | null;
  horaNormalizada: string | null;
  vendedorId: string | null;
  entregador: string | null;
  modalidade: string | null;
  lavado: boolean;
  acessorios: boolean;
  statusAgendamento: string | null;
  obsPosEntrega: string | null;
}

export interface AgendaAcessorios {
  id: string;
  chassi: string;
  ordem: number | null;
  localId: string | null;
  vendedorId: string | null;
  dataAgenda: string | null;
  horaAgenda: string | null;
  produtivo: string | null;
  valor: number | null;
  os: string | null;
  descricaoAcessorios: string | null;
}

export type TipoPosVenda = "revisao_6_meses" | "revisao_1_ano";

export const POS_VENDA_LABELS: Record<TipoPosVenda, string> = {
  revisao_6_meses: "Revisão 6 Meses",
  revisao_1_ano: "Revisão 1 Ano",
};

export interface PosVendaEvento {
  id: string;
  chassi: string;
  tipo: TipoPosVenda;
  dataEvento: string | null;
  status: string | null;
}

export const nextStage = (s: StatusPipeline): StatusPipeline | null => {
  const i = PIPELINE_STAGES.indexOf(s);
  return i >= 0 && i < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[i + 1] : null;
};

// =============================================================================
// Módulo de Tarefas — ver docs/v2-torre-de-controle/02-modelo-dados.md
// =============================================================================

export type TarefaCategoria =
  | "lavagem"
  | "acessorio"
  | "implemento"
  | "os"
  | "recall"
  | "bateria"
  | "avaria"
  | "oficina_falhas"
  | "oficina_parametrizacao"
  | "documentacao"
  | "qualidade"
  | "faturamento"
  | "outro";

export const TAREFA_CATEGORIA_LABELS: Record<TarefaCategoria, string> = {
  lavagem: "Lavagem",
  acessorio: "Acessório",
  implemento: "Implemento",
  os: "Ordem de Serviço",
  recall: "Recall/Campanha",
  bateria: "Bateria",
  avaria: "Avaria",
  oficina_falhas: "Oficina - Falhas",
  oficina_parametrizacao: "Oficina - Parametrização",
  documentacao: "Documentação",
  qualidade: "Qualidade",
  faturamento: "Faturamento",
  outro: "Outro",
};

// R6: categorias que impedem 06 Qualidade -> 07 Liberado enquanto houver tarefa aberta.
// Ver docs/v2-torre-de-controle/03-pipeline-regras.md (pergunta de negócio P0-2 em aberto).
export const TAREFA_CATEGORIAS_BLOQUEANTES: TarefaCategoria[] = [
  "recall",
  "avaria",
  "oficina_falhas",
  "oficina_parametrizacao",
  "documentacao",
  "qualidade",
];

export type TarefaStatus = "a_fazer" | "em_andamento" | "bloqueada" | "concluida";

export const TAREFA_STATUS_LABELS: Record<TarefaStatus, string> = {
  a_fazer: "A Fazer",
  em_andamento: "Em Andamento",
  bloqueada: "Bloqueada",
  concluida: "Concluída",
};

export const TAREFA_STATUS_ORDER: TarefaStatus[] = ["a_fazer", "em_andamento", "bloqueada", "concluida"];

export type TarefaPrioridade = "baixa" | "media" | "alta" | "critica";

export const TAREFA_PRIORIDADE_LABELS: Record<TarefaPrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export type TarefaAnexoTipo = "documento" | "imagem" | "audio";

export interface TarefaChecklistItem {
  id: string;
  tarefaId: string;
  texto: string;
  feito: boolean;
  ordem: number;
  feitoEm: string | null;
  feitoPor: string | null;
}

export interface TarefaAnexo {
  id: string;
  tarefaId: string;
  tipo: TarefaAnexoTipo;
  nome: string;
  url: string;
  tamanhoBytes: number | null;
  mimeType: string | null;
  enviadoPor: string | null;
  enviadoEm: string;
}

export interface TarefaComentario {
  id: string;
  tarefaId: string;
  autorId: string | null;
  texto: string;
  createdAt: string;
}

export interface TarefaHistorico {
  id: string;
  tarefaId: string;
  campo: string;
  valorAnterior: string | null;
  valorNovo: string | null;
  autorId: string | null;
  createdAt: string;
}

export interface Tarefa {
  id: string;
  chassi: string;
  titulo: string;
  descricao: string | null;
  categoria: TarefaCategoria;
  responsavelId: string | null;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  prazo: string | null;
  concluidaEm: string | null;
  valor: number | null;
  motivoBloqueio: string | null;
  fasePipeline: StatusPipeline | null;
  geradaAutomaticamente: boolean;
  criadaPor: string | null;
  createdAt: string;
  updatedAt: string;
}

export const isCategoriaBloqueante = (categoria: TarefaCategoria): boolean =>
  TAREFA_CATEGORIAS_BLOQUEANTES.includes(categoria);

// Repositório de dados do MVP: mock em memória + localStorage, com a MESMA forma
// de interface que um client Supabase real teria (funções async, chassi como
// chave). Trocar para Supabase depois é reimplementar este arquivo, sem tocar em UI.
import type {
  Vendedor, Local, Implemento, MotivoReprovacao, Veiculo, StatusHistorico,
  Movimentacao, AgendaEntrega, AgendaAcessorios, PosVendaEvento, StatusPipeline,
  Tarefa, TarefaChecklistItem, TarefaAnexo, TarefaComentario, TarefaHistorico,
  TarefaStatus, TarefaCategoria, TarefaPrioridade, TarefaAnexoTipo,
} from "@/types/domain";
import * as seed from "@/data/seed";
import { validateTransition, validateTarefaStatusChange, validateAgendamento, validateMovimentacao, type RuleViolation } from "@/lib/rules";
import type { ModalidadeTransporte, PrioridadeMovimentacao } from "@/types/domain";

// v3: adiciona o módulo de Tarefas (docs/v2-torre-de-controle).
const STORAGE_KEY = "belcar-torre-controle-db-v3";

interface DbShape {
  vendedores: Vendedor[];
  locais: Local[];
  implementos: Implemento[];
  motivosReprovacao: MotivoReprovacao[];
  veiculos: Veiculo[];
  statusHistorico: StatusHistorico[];
  movimentacoes: Movimentacao[];
  agendaEntregas: AgendaEntrega[];
  agendaAcessorios: AgendaAcessorios[];
  posVendaEventos: PosVendaEvento[];
  tarefas: Tarefa[];
  tarefaChecklistItems: TarefaChecklistItem[];
  tarefaAnexos: TarefaAnexo[];
  tarefaComentarios: TarefaComentario[];
  tarefaHistorico: TarefaHistorico[];
}

function seedShape(): DbShape {
  return {
    vendedores: seed.vendedores,
    locais: seed.locais,
    implementos: seed.implementos,
    motivosReprovacao: seed.motivosReprovacao,
    veiculos: seed.veiculos,
    statusHistorico: seed.statusHistorico,
    movimentacoes: seed.movimentacoes,
    agendaEntregas: seed.agendaEntregas,
    agendaAcessorios: seed.agendaAcessorios,
    posVendaEventos: seed.posVendaEventos,
    tarefas: seed.tarefas,
    tarefaChecklistItems: seed.tarefaChecklistItems,
    tarefaAnexos: [],
    tarefaComentarios: [],
    tarefaHistorico: seed.tarefaHistorico,
  };
}

function loadInitial(): DbShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DbShape;
  } catch {
    // ignore corrupted storage, fall back to seed
  }
  return seedShape();
}

let db: DbShape = loadInitial();
const listeners = new Set<() => void>();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): DbShape {
  return db;
}

export function resetToSeed() {
  localStorage.removeItem(STORAGE_KEY);
  db = seedShape();
  persist();
}

const delay = () => new Promise((r) => setTimeout(r, 120));
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const nowIso = () => new Date().toISOString();

// ---- Reads ----
export async function listVeiculos(): Promise<Veiculo[]> {
  await delay();
  return db.veiculos;
}

export async function getVeiculo(chassi: string): Promise<Veiculo | undefined> {
  await delay();
  return db.veiculos.find((v) => v.chassi === chassi);
}

export async function listHistorico(chassi: string): Promise<StatusHistorico[]> {
  await delay();
  return db.statusHistorico
    .filter((h) => h.chassi === chassi)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function listVendedores(): Promise<Vendedor[]> {
  await delay();
  return db.vendedores;
}

export async function listLocais(): Promise<Local[]> {
  await delay();
  return db.locais;
}

export async function listImplementos(): Promise<Implemento[]> {
  await delay();
  return db.implementos;
}

export async function listMotivosReprovacao(): Promise<MotivoReprovacao[]> {
  await delay();
  return db.motivosReprovacao;
}

export async function listMovimentacoes(): Promise<Movimentacao[]> {
  await delay();
  return db.movimentacoes;
}

export async function listAgendaEntregas(): Promise<AgendaEntrega[]> {
  await delay();
  return db.agendaEntregas;
}

export async function listAgendaAcessorios(): Promise<AgendaAcessorios[]> {
  await delay();
  return db.agendaAcessorios;
}

export async function listPosVendaEventos(): Promise<PosVendaEvento[]> {
  await delay();
  return db.posVendaEventos;
}

export async function listTarefas(): Promise<Tarefa[]> {
  await delay();
  return db.tarefas;
}

export function tarefasAbertasPorChassi(chassi: string): Tarefa[] {
  return db.tarefas.filter((t) => t.chassi === chassi && t.status !== "concluida");
}

// ---- Writes: veículo / pipeline ----

export interface AdvanceStatusInput {
  chassi: string;
  targetStatus: StatusPipeline;
  responsavelId: string | null;
  motivoReprovacaoId?: string | null;
  motivoTexto?: string | null;
}

export interface AdvanceResult {
  ok: boolean;
  violations: RuleViolation[];
}

// R4: nunca faz UPDATE destrutivo do status — sempre insere uma linha nova em
// status_historico e o "status atual" é derivado dessa linha (espelha o trigger
// fn_sync_status_atual do schema.sql).
export async function advanceStatus(input: AdvanceStatusInput): Promise<AdvanceResult> {
  await delay();
  const veiculo = db.veiculos.find((v) => v.chassi === input.chassi);
  if (!veiculo) return { ok: false, violations: [] };

  const violations = validateTransition({
    veiculo,
    targetStatus: input.targetStatus,
    responsavelId: input.responsavelId,
    motivoReprovacaoId: input.motivoReprovacaoId ?? null,
    motivoTexto: input.motivoTexto ?? null,
    tarefasAbertas: tarefasAbertasPorChassi(input.chassi),
  });
  if (violations.length > 0) return { ok: false, violations };

  const historicoEntry: StatusHistorico = {
    id: uid("hist"),
    chassi: input.chassi,
    statusAnterior: veiculo.statusAtual,
    statusNovo: input.targetStatus,
    responsavelId: input.responsavelId,
    motivoReprovacaoId: input.motivoReprovacaoId ?? null,
    motivoTexto: input.motivoTexto ?? null,
    createdAt: nowIso(),
  };

  db = {
    ...db,
    statusHistorico: [...db.statusHistorico, historicoEntry],
    veiculos: db.veiculos.map((v) =>
      v.chassi === input.chassi
        ? { ...v, statusAtual: input.targetStatus, responsavelId: input.responsavelId, updatedAt: historicoEntry.createdAt }
        : v
    ),
  };
  persist();
  return { ok: true, violations: [] };
}

export interface UpdateVeiculoInput {
  chassi: string;
  patch: Partial<Pick<Veiculo,
    "nf" | "dataFaturamento" | "responsavelId" | "vendedorId" | "localAtualId" | "implementoId" |
    "pago" | "recallStatus" | "avariado" | "pendenciaBateria" | "pendenciaOficina" | "observacoes" |
    "cliente" | "custoNotaEntrada" | "valorNotaSaida"
  >>;
}

// Cliente só pode ser adicionado/editado enquanto o veículo ainda não foi
// faturado (estágio 01) — depois da NF o cliente é dado fiscal, não editável.
export function clienteEditavel(veiculo: Veiculo): boolean {
  return veiculo.statusAtual === "01_aguardando_faturamento";
}

export async function updateVeiculo(input: UpdateVeiculoInput): Promise<void> {
  await delay();
  const veiculo = db.veiculos.find((v) => v.chassi === input.chassi);
  if (!veiculo) return;
  const patch = { ...input.patch };
  if ("cliente" in patch && !clienteEditavel(veiculo)) {
    delete patch.cliente;
  }
  db = {
    ...db,
    veiculos: db.veiculos.map((v) =>
      v.chassi === input.chassi ? { ...v, ...patch, updatedAt: nowIso() } : v
    ),
  };
  persist();
}

// ---- Writes: Movimentação ----

export interface CreateMovimentacaoInput {
  chassi: string;
  destinoLocalId: string | null;
  motorista?: string | null;
  km?: number | null;
  modalidadeTransporte?: ModalidadeTransporte | null;
  prioridade?: PrioridadeMovimentacao;
  observacoes?: string | null;
}

// R10: movimenta faturado ou não faturado — nunca entregue/encerrado.
// A origem é sempre o local atual do veículo no momento da solicitação.
export async function createMovimentacao(input: CreateMovimentacaoInput): Promise<AdvanceResult & { movimentacao?: Movimentacao }> {
  await delay();
  const veiculo = db.veiculos.find((v) => v.chassi === input.chassi);
  if (!veiculo) return { ok: false, violations: [{ rule: "R10", message: "Veículo não encontrado." }] };

  const violations = validateMovimentacao(veiculo);
  if (violations.length > 0) return { ok: false, violations };

  const movimentacao: Movimentacao = {
    id: uid("mov"),
    chassi: input.chassi,
    prioridade: input.prioridade ?? "4_na_fila",
    origemLocalId: veiculo.localAtualId,
    destinoLocalId: input.destinoLocalId,
    motorista: input.motorista?.trim() || null,
    dataSolicitacao: nowIso().slice(0, 10),
    dataRetirada: null,
    dataChegada: null,
    observacoes: input.observacoes?.trim() || null,
    km: input.km ?? null,
    modalidadeTransporte: input.modalidadeTransporte ?? null,
  };
  db = { ...db, movimentacoes: [...db.movimentacoes, movimentacao] };
  persist();
  return { ok: true, violations: [], movimentacao };
}

// Finalizar movimentação: marca chegada, registra km final e atualiza o local
// atual do veículo para o destino — o mapa de locais nunca fica defasado.
export async function finalizarMovimentacao(movimentacaoId: string, kmChegada?: number | null): Promise<void> {
  await delay();
  const mov = db.movimentacoes.find((m) => m.id === movimentacaoId);
  if (!mov) return;
  const hoje = nowIso().slice(0, 10);
  db = {
    ...db,
    movimentacoes: db.movimentacoes.map((m) =>
      m.id === movimentacaoId
        ? { ...m, prioridade: "6_finalizado" as PrioridadeMovimentacao, dataChegada: hoje, km: kmChegada ?? m.km ?? null }
        : m
    ),
    veiculos: mov.destinoLocalId
      ? db.veiculos.map((v) =>
          v.chassi === mov.chassi ? { ...v, localAtualId: mov.destinoLocalId, updatedAt: nowIso() } : v
        )
      : db.veiculos,
  };
  persist();
}

// ---- Writes: Agenda de Entrega ----

export interface CreateAgendaEntregaInput {
  chassi: string;
  data: string; // yyyy-mm-dd
  horaRaw?: string | null;
  vendedorId?: string | null;
  entregador?: string | null;
  modalidade?: string | null;
}

// R9: entrega só é agendada com a preparação pronta (07 Liberado) e para data
// futura. Agendar também avança o veículo 07 → 08 no mesmo ato, com a linha de
// histórico correspondente (R4) — agenda e pipeline nunca divergem.
export async function createAgendaEntrega(input: CreateAgendaEntregaInput): Promise<AdvanceResult & { agenda?: AgendaEntrega }> {
  await delay();
  const veiculo = db.veiculos.find((v) => v.chassi === input.chassi);
  if (!veiculo) return { ok: false, violations: [{ rule: "R9", message: "Veículo não encontrado." }] };

  const responsavelId = veiculo.responsavelId ?? input.vendedorId ?? null;
  const precisaAvancar = veiculo.statusAtual === "07_liberado";

  const violations = [
    ...validateAgendamento({ veiculo, data: input.data }),
    ...(precisaAvancar
      ? validateTransition({
          veiculo,
          targetStatus: "08_agendado_cliente",
          responsavelId,
          motivoReprovacaoId: null,
          motivoTexto: null,
          tarefasAbertas: tarefasAbertasPorChassi(input.chassi),
        })
      : []),
  ];
  if (violations.length > 0) return { ok: false, violations };

  const hora = input.horaRaw?.trim() || null;
  const agenda: AgendaEntrega = {
    id: uid("agenda"),
    chassi: input.chassi,
    data: input.data,
    horaRaw: hora,
    horaNormalizada: hora && /^\d{1,2}:\d{2}$/.test(hora) ? hora : null,
    vendedorId: input.vendedorId ?? veiculo.vendedorId,
    entregador: input.entregador?.trim() || null,
    modalidade: input.modalidade?.trim() || null,
    lavado: false,
    acessorios: false,
    statusAgendamento: "AGENDADO",
    obsPosEntrega: null,
  };

  const createdAt = nowIso();
  const historico: StatusHistorico[] = precisaAvancar
    ? [{
        id: uid("hist"),
        chassi: input.chassi,
        statusAnterior: veiculo.statusAtual,
        statusNovo: "08_agendado_cliente",
        responsavelId,
        motivoReprovacaoId: null,
        motivoTexto: `Entrega agendada para ${input.data}${hora ? ` ${hora}` : ""}`,
        createdAt,
      }]
    : [];

  db = {
    ...db,
    agendaEntregas: [...db.agendaEntregas, agenda],
    statusHistorico: [...db.statusHistorico, ...historico],
    veiculos: precisaAvancar
      ? db.veiculos.map((v) =>
          v.chassi === input.chassi
            ? { ...v, statusAtual: "08_agendado_cliente" as StatusPipeline, responsavelId, updatedAt: createdAt }
            : v
        )
      : db.veiculos,
  };
  persist();
  return { ok: true, violations: [], agenda };
}

// ---- Writes: Tarefas (ver docs/v2-torre-de-controle/02-modelo-dados.md) ----

function addTarefaHistorico(tarefaId: string, campo: string, valorAnterior: string | null, valorNovo: string | null, autorId: string | null) {
  const entry: TarefaHistorico = {
    id: uid("tarhist"),
    tarefaId,
    campo,
    valorAnterior,
    valorNovo,
    autorId,
    createdAt: nowIso(),
  };
  db = { ...db, tarefaHistorico: [...db.tarefaHistorico, entry] };
}

export interface CreateTarefaInput {
  chassi: string;
  titulo: string;
  descricao?: string | null;
  categoria: TarefaCategoria;
  responsavelId?: string | null;
  prioridade?: TarefaPrioridade;
  prazo?: string | null;
  valor?: number | null;
  fasePipeline?: StatusPipeline | null;
  criadaPor?: string | null;
  geradaAutomaticamente?: boolean;
}

export async function createTarefa(input: CreateTarefaInput): Promise<Tarefa> {
  await delay();
  const now = nowIso();
  const tarefa: Tarefa = {
    id: uid("tarefa"),
    chassi: input.chassi,
    titulo: input.titulo,
    descricao: input.descricao ?? null,
    categoria: input.categoria,
    responsavelId: input.responsavelId ?? null,
    status: "a_fazer",
    prioridade: input.prioridade ?? "media",
    prazo: input.prazo ?? null,
    concluidaEm: null,
    valor: input.valor ?? null,
    motivoBloqueio: null,
    fasePipeline: input.fasePipeline ?? null,
    geradaAutomaticamente: input.geradaAutomaticamente ?? false,
    criadaPor: input.criadaPor ?? null,
    createdAt: now,
    updatedAt: now,
  };
  addTarefaHistorico(tarefa.id, "criacao", null, tarefa.titulo, input.criadaPor ?? null);
  db = { ...db, tarefas: [...db.tarefas, tarefa] };
  persist();
  return tarefa;
}

export interface UpdateTarefaStatusInput {
  tarefaId: string;
  targetStatus: TarefaStatus;
  responsavelId?: string | null;
  motivoBloqueio?: string | null;
  autorId?: string | null;
}

export async function updateTarefaStatus(input: UpdateTarefaStatusInput): Promise<AdvanceResult> {
  await delay();
  const tarefa = db.tarefas.find((t) => t.id === input.tarefaId);
  if (!tarefa) return { ok: false, violations: [] };

  const responsavelId = input.responsavelId !== undefined ? input.responsavelId : tarefa.responsavelId;
  const violations = validateTarefaStatusChange({
    targetStatus: input.targetStatus,
    responsavelId,
    motivoBloqueio: input.motivoBloqueio ?? tarefa.motivoBloqueio,
  });
  if (violations.length > 0) return { ok: false, violations };

  addTarefaHistorico(tarefa.id, "status", tarefa.status, input.targetStatus, input.autorId ?? null);
  if (responsavelId !== tarefa.responsavelId) {
    addTarefaHistorico(tarefa.id, "responsavel_id", tarefa.responsavelId, responsavelId, input.autorId ?? null);
  }

  db = {
    ...db,
    tarefas: db.tarefas.map((t) =>
      t.id === input.tarefaId
        ? {
            ...t,
            status: input.targetStatus,
            responsavelId,
            motivoBloqueio: input.targetStatus === "bloqueada" ? (input.motivoBloqueio ?? t.motivoBloqueio) : null,
            concluidaEm: input.targetStatus === "concluida" ? nowIso() : null,
            updatedAt: nowIso(),
          }
        : t
    ),
  };
  persist();
  return { ok: true, violations: [] };
}

export interface UpdateTarefaCampoInput {
  tarefaId: string;
  patch: Partial<Pick<Tarefa, "titulo" | "descricao" | "responsavelId" | "prioridade" | "prazo" | "valor" | "categoria">>;
  autorId?: string | null;
}

export async function updateTarefaCampo(input: UpdateTarefaCampoInput): Promise<void> {
  await delay();
  const tarefa = db.tarefas.find((t) => t.id === input.tarefaId);
  if (!tarefa) return;

  (Object.keys(input.patch) as (keyof typeof input.patch)[]).forEach((campo) => {
    const valorAnterior = tarefa[campo];
    const valorNovo = input.patch[campo];
    if (valorAnterior !== valorNovo) {
      addTarefaHistorico(tarefa.id, campo, valorAnterior == null ? null : String(valorAnterior), valorNovo == null ? null : String(valorNovo), input.autorId ?? null);
    }
  });

  db = {
    ...db,
    tarefas: db.tarefas.map((t) => (t.id === input.tarefaId ? { ...t, ...input.patch, updatedAt: nowIso() } : t)),
  };
  persist();
}

export async function addChecklistItem(tarefaId: string, texto: string): Promise<void> {
  await delay();
  const ordem = db.tarefaChecklistItems.filter((i) => i.tarefaId === tarefaId).length;
  const item: TarefaChecklistItem = {
    id: uid("chk"),
    tarefaId,
    texto,
    feito: false,
    ordem,
    feitoEm: null,
    feitoPor: null,
  };
  db = { ...db, tarefaChecklistItems: [...db.tarefaChecklistItems, item] };
  persist();
}

export async function toggleChecklistItem(itemId: string, autorId: string | null): Promise<void> {
  await delay();
  db = {
    ...db,
    tarefaChecklistItems: db.tarefaChecklistItems.map((item) =>
      item.id === itemId
        ? { ...item, feito: !item.feito, feitoEm: !item.feito ? nowIso() : null, feitoPor: !item.feito ? autorId : null }
        : item
    ),
  };
  persist();
}

export interface AddAnexoInput {
  tarefaId: string;
  tipo: TarefaAnexoTipo;
  nome: string;
  url: string;
  tamanhoBytes?: number | null;
  mimeType?: string | null;
  enviadoPor?: string | null;
}

export async function addAnexo(input: AddAnexoInput): Promise<TarefaAnexo> {
  await delay();
  const anexo: TarefaAnexo = {
    id: uid("anexo"),
    tarefaId: input.tarefaId,
    tipo: input.tipo,
    nome: input.nome,
    url: input.url,
    tamanhoBytes: input.tamanhoBytes ?? null,
    mimeType: input.mimeType ?? null,
    enviadoPor: input.enviadoPor ?? null,
    enviadoEm: nowIso(),
  };
  db = { ...db, tarefaAnexos: [...db.tarefaAnexos, anexo] };
  persist();
  return anexo;
}

export async function deleteAnexo(anexoId: string): Promise<void> {
  await delay();
  db = { ...db, tarefaAnexos: db.tarefaAnexos.filter((a) => a.id !== anexoId) };
  persist();
}

export async function addComentario(tarefaId: string, texto: string, autorId: string | null): Promise<TarefaComentario> {
  await delay();
  const comentario: TarefaComentario = {
    id: uid("coment"),
    tarefaId,
    autorId,
    texto,
    createdAt: nowIso(),
  };
  db = { ...db, tarefaComentarios: [...db.tarefaComentarios, comentario] };
  persist();
  return comentario;
}

// ---- Writes: Cadastros de Apoio (vendedor/local/implemento) ----

export async function renameVendedor(id: string, nome: string): Promise<void> {
  await delay();
  db = { ...db, vendedores: db.vendedores.map((v) => (v.id === id ? { ...v, nome } : v)) };
  persist();
}

export async function renameLocal(id: string, nome: string): Promise<void> {
  await delay();
  db = { ...db, locais: db.locais.map((l) => (l.id === id ? { ...l, nome } : l)) };
  persist();
}

export async function renameImplemento(id: string, nome: string): Promise<void> {
  await delay();
  db = { ...db, implementos: db.implementos.map((i) => (i.id === id ? { ...i, nome } : i)) };
  persist();
}

export async function createMotivoReprovacao(descricao: string): Promise<MotivoReprovacao> {
  await delay();
  const motivo: MotivoReprovacao = { id: uid("mot"), descricao, ativo: true };
  db = { ...db, motivosReprovacao: [...db.motivosReprovacao, motivo] };
  persist();
  return motivo;
}

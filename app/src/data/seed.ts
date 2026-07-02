// Dados reais da Belcar, importados via ETL (scratchpad/etl.py) a partir dos
// CSVs exportados da planilha oficial "Cópia de ENTREGA TECNICA -belcar".
// Ver docs/de-para-status.md para as regras de mapeamento aplicadas e
// docs/perguntas-negocio.md para os pontos que ainda dependem de decisão do
// negócio (ex.: stages 04-07 vazios porque a aba PROGRAMAÇÃO não foi
// exportada nesta rodada).
import type {
  Vendedor, Local, Implemento, MotivoReprovacao, Veiculo, StatusHistorico,
  Movimentacao, AgendaEntrega, AgendaAcessorios, PosVendaEvento,
  Tarefa, TarefaChecklistItem, TarefaHistorico,
} from "@/types/domain";
import raw from "@/data/real-seed.json";

interface RawSeed {
  vendedores: Vendedor[];
  locais: Local[];
  implementos: Implemento[];
  veiculos: Veiculo[];
  movimentacoes: Movimentacao[];
  agendaEntregas: AgendaEntrega[];
  agendaAcessorios: AgendaAcessorios[];
  posVendaEventos: PosVendaEvento[];
}

const data = raw as unknown as RawSeed;

export const vendedores: Vendedor[] = data.vendedores;
export const locais: Local[] = data.locais;
export const implementos: Implemento[] = data.implementos;

// Catálogo de motivos de reprovação: não existe na planilha legada (a
// reprovação hoje é texto livre em observação). É um catálogo novo que a
// Torre de Controle introduz junto com a regra R3.
export const motivosReprovacao: MotivoReprovacao[] = [
  "Avaria na lataria",
  "Avaria em implemento",
  "Item de acessório faltando",
  "Lavagem insatisfatória",
  "Documentação divergente",
  "Pendência mecânica identificada na inspeção",
].map((descricao, i) => ({ id: `mot-${i + 1}`, descricao, ativo: true }));

export const veiculos: Veiculo[] = data.veiculos;

const nowIso = new Date().toISOString();
export const statusHistorico: StatusHistorico[] = veiculos.map((v, i) => ({
  id: `hist-${i + 1}`,
  chassi: v.chassi,
  statusAnterior: null,
  statusNovo: v.statusAtual,
  responsavelId: v.responsavelId,
  motivoReprovacaoId: null,
  motivoTexto: "Importado da planilha real Belcar (ETL 2026-07-01)",
  createdAt: nowIso,
}));

export const movimentacoes: Movimentacao[] = data.movimentacoes;
export const agendaEntregas: AgendaEntrega[] = data.agendaEntregas;
export const agendaAcessorios: AgendaAcessorios[] = data.agendaAcessorios;
export const posVendaEventos: PosVendaEvento[] = data.posVendaEventos;

// =============================================================================
// Módulo de Tarefas — geradas a partir do dado real já importado, refletindo
// o que a operação já sabia mas não tinha estrutura (ver
// docs/v2-torre-de-controle/02-modelo-dados.md, "Tarefas Automáticas").
// Estas SÃO ativadas no seed (diferente da recomendação de produção de deixar
// desligado por padrão) só para demonstrar o módulo com dado real no MVP.
// =============================================================================
const veiculoByChassi = new Map(veiculos.map((v) => [v.chassi, v]));

function buildTarefas(): { tarefas: Tarefa[]; checklist: TarefaChecklistItem[]; historico: TarefaHistorico[] } {
  const tarefas: Tarefa[] = [];
  const checklist: TarefaChecklistItem[] = [];
  const historico: TarefaHistorico[] = [];
  let seq = 0;

  const push = (t: Omit<Tarefa, "id" | "createdAt" | "updatedAt" | "concluidaEm" | "motivoBloqueio" | "geradaAutomaticamente" | "criadaPor">) => {
    seq += 1;
    const id = `tarefa-${seq}`;
    const createdAt = nowIso;
    tarefas.push({
      ...t,
      id,
      concluidaEm: null,
      motivoBloqueio: null,
      geradaAutomaticamente: true,
      criadaPor: null,
      createdAt,
      updatedAt: createdAt,
    });
    historico.push({
      id: `tarhist-${seq}`,
      tarefaId: id,
      campo: "criacao",
      valorAnterior: null,
      valorNovo: t.titulo,
      autorId: null,
      createdAt,
    });
    return id;
  };

  // 1) Toda linha de agenda_acessorios vira tarefa categoria 'acessorio'
  for (const a of agendaAcessorios) {
    const veiculo = veiculoByChassi.get(a.chassi);
    if (!veiculo) continue;
    const id = push({
      chassi: a.chassi,
      titulo: a.descricaoAcessorios ? `Acessórios: ${a.descricaoAcessorios.slice(0, 60)}` : "Instalação de acessórios",
      descricao: a.descricaoAcessorios,
      categoria: "acessorio",
      responsavelId: a.vendedorId,
      status: "a_fazer",
      prioridade: "media",
      prazo: a.dataAgenda,
      valor: a.valor,
      fasePipeline: "05_em_preparacao",
    });
    if (a.descricaoAcessorios) {
      a.descricaoAcessorios.split(/[,;]| E /i).map((s) => s.trim()).filter(Boolean).slice(0, 6).forEach((texto, i) => {
        checklist.push({ id: `chk-${id}-${i}`, tarefaId: id, texto, feito: false, ordem: i, feitoEm: null, feitoPor: null });
      });
    }
  }

  // 2) Veículo com recall pendente ou em serviço vira tarefa categoria 'recall'
  for (const v of veiculos) {
    if (v.recallStatus === "tem" || v.recallStatus === "em_servico") {
      push({
        chassi: v.chassi,
        titulo: "Executar recall/campanha",
        descricao: v.observacoes,
        categoria: "recall",
        responsavelId: null,
        status: "a_fazer",
        prioridade: v.recallStatus === "tem" ? "alta" : "media",
        prazo: null,
        valor: null,
        fasePipeline: v.statusAtual,
      });
    }
  }

  // 3) Veículo em preparação ganha tarefa de lavagem
  for (const v of veiculos) {
    if (v.statusAtual === "05_em_preparacao") {
      push({
        chassi: v.chassi,
        titulo: "Lavar veículo",
        descricao: null,
        categoria: "lavagem",
        responsavelId: null,
        status: "a_fazer",
        prioridade: "baixa",
        prazo: null,
        valor: null,
        fasePipeline: "05_em_preparacao",
      });
    }
    if (v.avariado) {
      push({
        chassi: v.chassi,
        titulo: "Reparar avaria identificada",
        descricao: v.observacoes,
        categoria: "avaria",
        responsavelId: null,
        status: "a_fazer",
        prioridade: "critica",
        prazo: null,
        valor: null,
        fasePipeline: v.statusAtual,
      });
    }
    if (v.pendenciaOficina) {
      push({
        chassi: v.chassi,
        titulo: v.pendenciaOficina === "falhas" ? "Corrigir falha identificada na oficina" : "Parametrizar veículo na oficina",
        descricao: null,
        categoria: v.pendenciaOficina === "falhas" ? "oficina_falhas" : "oficina_parametrizacao",
        responsavelId: null,
        status: "a_fazer",
        prioridade: "alta",
        prazo: null,
        valor: null,
        fasePipeline: v.statusAtual,
      });
    }
  }

  return { tarefas, checklist, historico };
}

const generated = buildTarefas();
export const tarefas: Tarefa[] = generated.tarefas;
export const tarefaChecklistItems: TarefaChecklistItem[] = generated.checklist;
export const tarefaHistorico: TarefaHistorico[] = generated.historico;

import type { Veiculo, StatusPipeline, Tarefa, TarefaStatus } from "@/types/domain";
import { isCategoriaBloqueante, STAGE_LABELS } from "@/types/domain";

export interface RuleViolation {
  rule: "R1" | "R2" | "R3" | "R5" | "R6" | "R7" | "R9" | "R10";
  message: string;
}

interface AdvanceInput {
  veiculo: Veiculo;
  targetStatus: StatusPipeline;
  responsavelId: string | null;
  motivoReprovacaoId: string | null;
  motivoTexto: string | null;
  // Tarefas abertas deste veículo, usadas pelo gate R6. Opcional pra não quebrar chamadas
  // que ainda não têm acesso à lista de tarefas.
  tarefasAbertas?: Tarefa[];
}

// R1: gate bloqueante — não sai de "01 Aguardando Faturamento" sem NF e data de faturamento.
function checkR1(input: AdvanceInput): RuleViolation | null {
  const { veiculo, targetStatus } = input;
  if (veiculo.statusAtual === "01_aguardando_faturamento" && targetStatus !== "01_aguardando_faturamento") {
    if (!veiculo.nf || !veiculo.dataFaturamento) {
      return { rule: "R1", message: "Não é possível avançar: falta NF e/ou data de faturamento." };
    }
  }
  return null;
}

// R2: não avança etapa sem responsável atribuído.
function checkR2(input: AdvanceInput): RuleViolation | null {
  if (!input.responsavelId) {
    return { rule: "R2", message: "Não é possível avançar: nenhum responsável atribuído para esta etapa." };
  }
  return null;
}

// R3: reprovado na Qualidade (06) volta pra Preparação (05) com motivo obrigatório.
function checkR3(input: AdvanceInput): RuleViolation | null {
  const { veiculo, targetStatus, motivoReprovacaoId, motivoTexto } = input;
  const isReprovacao = veiculo.statusAtual === "06_qualidade" && targetStatus === "05_em_preparacao";
  if (isReprovacao && !motivoReprovacaoId && !motivoTexto?.trim()) {
    return { rule: "R3", message: "Reprovação exige motivo obrigatório." };
  }
  return null;
}

// R6: 06 Qualidade só avança pra 07 Liberado sem tarefa bloqueante em aberto.
function checkR6(input: AdvanceInput): RuleViolation | null {
  const { veiculo, targetStatus, tarefasAbertas } = input;
  const isLiberacao = veiculo.statusAtual === "06_qualidade" && targetStatus === "07_liberado";
  if (!isLiberacao || !tarefasAbertas) return null;

  const bloqueantes = tarefasAbertas.filter(
    (t) => t.status !== "concluida" && isCategoriaBloqueante(t.categoria)
  );
  if (bloqueantes.length > 0) {
    const titulos = bloqueantes.map((t) => t.titulo).join(", ");
    return { rule: "R6", message: `Não é possível liberar: tarefa(s) bloqueante(s) em aberto — ${titulos}.` };
  }
  return null;
}

export function validateTransition(input: AdvanceInput): RuleViolation[] {
  return [checkR1, checkR2, checkR3, checkR6]
    .map((fn) => fn(input))
    .filter((v): v is RuleViolation => v !== null);
}

// -----------------------------------------------------------------------
// Regras do módulo de Tarefas (R5, R7)
// -----------------------------------------------------------------------

interface TarefaStatusChangeInput {
  targetStatus: TarefaStatus;
  responsavelId: string | null;
  motivoBloqueio: string | null;
}

// R5: tarefa não pode ir para 'em_andamento' sem responsável.
function checkR5(input: TarefaStatusChangeInput): RuleViolation | null {
  if (input.targetStatus === "em_andamento" && !input.responsavelId) {
    return { rule: "R5", message: "Tarefa não pode ir para Em Andamento sem responsável." };
  }
  return null;
}

// R7: tarefa não pode ir para 'bloqueada' sem motivo.
function checkR7(input: TarefaStatusChangeInput): RuleViolation | null {
  if (input.targetStatus === "bloqueada" && !input.motivoBloqueio?.trim()) {
    return { rule: "R7", message: "Tarefa bloqueada exige motivo obrigatório." };
  }
  return null;
}

export function validateTarefaStatusChange(input: TarefaStatusChangeInput): RuleViolation[] {
  return [checkR5, checkR7]
    .map((fn) => fn(input))
    .filter((v): v is RuleViolation => v !== null);
}

// -----------------------------------------------------------------------
// R9 — Agendamento de entrega
// -----------------------------------------------------------------------

// Estágios em que o veículo pode receber agendamento de entrega: preparação
// totalmente concluída (07 Liberado) ou reagendamento de quem já está em 08.
const ESTAGIOS_AGENDAVEIS: StatusPipeline[] = ["07_liberado", "08_agendado_cliente"];

export interface AgendamentoInput {
  veiculo: Veiculo;
  data: string; // yyyy-mm-dd
}

// -----------------------------------------------------------------------
// R10 — Movimentação
// -----------------------------------------------------------------------

// R10: movimentação pode ocorrer para veículo faturado OU ainda não faturado —
// o único bloqueio é veículo já entregue/encerrado (não se movimenta o que já
// está com o cliente).
export function validateMovimentacao(veiculo: Veiculo): RuleViolation[] {
  if (veiculo.statusAtual === "09_entregue" || veiculo.statusAtual === "10_encerrado") {
    return [{
      rule: "R10",
      message: `Veículo em ${STAGE_LABELS[veiculo.statusAtual]} não pode ser movimentado — já foi entregue ao cliente.`,
    }];
  }
  return [];
}

// R9: entrega só é agendada com todo o processo de preparação pronto e para
// data de hoje em diante — a agenda é sempre futura.
export function validateAgendamento({ veiculo, data }: AgendamentoInput): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (!ESTAGIOS_AGENDAVEIS.includes(veiculo.statusAtual)) {
    violations.push({
      rule: "R9",
      message: `Só é possível agendar entrega com a preparação concluída (07 Liberado). Este veículo está em ${STAGE_LABELS[veiculo.statusAtual]}.`,
    });
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(data + "T00:00:00");
  if (Number.isNaN(alvo.getTime()) || alvo.getTime() < hoje.getTime()) {
    violations.push({ rule: "R9", message: "A data da entrega deve ser hoje ou uma data futura." });
  }

  return violations;
}

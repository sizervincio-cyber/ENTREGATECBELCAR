import { AlertTriangle, CheckCircle2, CircleDashed, PlayCircle, Ban } from "lucide-react";
import type { TarefaPrioridade, TarefaStatus, TarefaCategoria } from "@/types/domain";
import { TAREFA_PRIORIDADE_LABELS, TAREFA_STATUS_LABELS, TAREFA_CATEGORIA_LABELS, isCategoriaBloqueante } from "@/types/domain";
import { cn } from "@/lib/utils";

const prioridadeTone: Record<TarefaPrioridade, string> = {
  baixa: "bg-fase1-bg text-fase1",
  media: "bg-belcar-100 text-belcar-700",
  alta: "bg-warning-bg text-warning",
  critica: "bg-danger-bg text-danger",
};

export function TarefaPrioridadeBadge({ prioridade, className }: { prioridade: TarefaPrioridade; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", prioridadeTone[prioridade], className)}>
      {TAREFA_PRIORIDADE_LABELS[prioridade]}
    </span>
  );
}

const statusTone: Record<TarefaStatus, string> = {
  a_fazer: "bg-fase1-bg text-fase1",
  em_andamento: "bg-belcar-100 text-belcar-700",
  bloqueada: "bg-danger-bg text-danger",
  concluida: "bg-success-bg text-success",
};

const statusIcon: Record<TarefaStatus, typeof AlertTriangle> = {
  a_fazer: CircleDashed,
  em_andamento: PlayCircle,
  bloqueada: Ban,
  concluida: CheckCircle2,
};

export function TarefaStatusBadge({ status, className }: { status: TarefaStatus; className?: string }) {
  const Icon = statusIcon[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", statusTone[status], className)}>
      <Icon size={11} />
      {TAREFA_STATUS_LABELS[status]}
    </span>
  );
}

export function TarefaCategoriaBadge({ categoria, className }: { categoria: TarefaCategoria; className?: string }) {
  const bloqueante = isCategoriaBloqueante(categoria);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        bloqueante ? "bg-danger-bg text-danger" : "bg-fase1-bg text-fase1",
        className
      )}
      title={bloqueante ? "Categoria bloqueante — impede liberação sem conclusão" : "Categoria informativa — não bloqueia liberação"}
    >
      {bloqueante && <AlertTriangle size={11} />}
      {TAREFA_CATEGORIA_LABELS[categoria]}
    </span>
  );
}

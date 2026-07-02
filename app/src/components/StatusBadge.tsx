import { STAGE_LABELS, STAGE_FASE, type StatusPipeline } from "@/types/domain";
import { cn } from "@/lib/utils";

const FASE_CLASSES: Record<string, string> = {
  fluxo_interno: "bg-fase1-bg text-fase1",
  controle: "bg-fase2-bg text-fase2",
  entrega: "bg-fase3-bg text-fase3",
};

export function StatusBadge({ status, className }: { status: StatusPipeline; className?: string }) {
  const fase = STAGE_FASE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        FASE_CLASSES[fase],
        className
      )}
    >
      {status.slice(0, 2)} · {STAGE_LABELS[status]}
    </span>
  );
}

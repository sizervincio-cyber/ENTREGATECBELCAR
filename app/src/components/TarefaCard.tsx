import { useState } from "react";
import type { Tarefa } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TarefaCategoriaBadge, TarefaPrioridadeBadge } from "@/components/TarefaBadges";
import { AdvanceTarefaDialog } from "@/components/AdvanceTarefaDialog";
import { useVendedores, useVeiculo } from "@/data/hooks";
import { cn, formatCurrency, formatDate, urgenciaPrazo, URGENCIA_LABELS } from "@/lib/utils";
import { Paperclip, ArrowRightCircle } from "lucide-react";
import { useTarefaAnexos } from "@/data/hooks";

const URGENCIA_CLASS: Record<string, string> = {
  vencido: "text-danger font-semibold",
  hoje: "text-warning font-semibold",
  proximo: "text-warning",
  em_dia: "text-muted",
  sem_prazo: "text-muted",
};

export function TarefaCard({ tarefa, onOpen, showChassi = true }: { tarefa: Tarefa; onOpen: (id: string) => void; showChassi?: boolean }) {
  const vendedores = useVendedores();
  const veiculo = useVeiculo(tarefa.chassi);
  const anexos = useTarefaAnexos(tarefa.id);
  const [advanceOpen, setAdvanceOpen] = useState(false);

  const responsavel = vendedores.find((v) => v.id === tarefa.responsavelId)?.nome;
  const urgencia = urgenciaPrazo(tarefa.prazo);

  return (
    <Card className="flex flex-col gap-2 p-3 hover:border-belcar-500 transition-colors cursor-pointer" onClick={() => onOpen(tarefa.id)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{tarefa.titulo}</p>
        <TarefaPrioridadeBadge prioridade={tarefa.prioridade} />
      </div>
      {showChassi && (
        <p className="text-xs text-muted">
          {tarefa.chassi} {veiculo ? `· ${veiculo.veiculo}` : ""}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <TarefaCategoriaBadge categoria={tarefa.categoria} />
        {tarefa.valor != null && <span className="text-xs font-medium text-ink">{formatCurrency(tarefa.valor)}</span>}
      </div>
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className={cn(URGENCIA_CLASS[urgencia])}>
          {tarefa.prazo ? `${formatDate(tarefa.prazo)} · ${URGENCIA_LABELS[urgencia]}` : "Sem prazo"}
        </span>
        <span className="flex items-center gap-2 text-muted">
          {anexos.length > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip size={11} /> {anexos.length}
            </span>
          )}
          {responsavel ?? "Sem responsável"}
        </span>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="secondary" className="w-full" onClick={() => setAdvanceOpen(true)}>
          <ArrowRightCircle size={12} /> Mover
        </Button>
      </div>
      <AdvanceTarefaDialog tarefa={tarefa} open={advanceOpen} onOpenChange={setAdvanceOpen} />
    </Card>
  );
}

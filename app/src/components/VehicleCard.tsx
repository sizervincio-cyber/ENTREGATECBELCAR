import { useState } from "react";
import { Link } from "react-router-dom";
import type { Veiculo } from "@/types/domain";
import { nextStage, STAGE_LABELS } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlagBadges } from "@/components/FlagBadges";
import { AdvanceStageDialog } from "@/components/AdvanceStageDialog";
import { useLocais, useVendedores } from "@/data/hooks";
import { daysSince, formatCurrency } from "@/lib/utils";
import { ArrowRight, XCircle } from "lucide-react";

export function VehicleCard({ veiculo, compact = false }: { veiculo: Veiculo; compact?: boolean }) {
  const locais = useLocais();
  const vendedores = useVendedores();
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const local = locais.find((l) => l.id === veiculo.localAtualId)?.nome;
  const responsavel = vendedores.find((v) => v.id === veiculo.responsavelId)?.nome;
  const target = nextStage(veiculo.statusAtual);
  // 04 e 06 são checklist na transição — o botão pula direto pro destino real.
  const displayTarget =
    veiculo.statusAtual === "03_em_patio" ? "05_em_preparacao"
    : veiculo.statusAtual === "05_em_preparacao" ? "07_liberado"
    : target;
  const isQualidade = veiculo.statusAtual === "06_qualidade";
  const days = daysSince(veiculo.updatedAt);

  if (compact) {
    return (
      <Card className="flex flex-col gap-1 p-2 transition-colors hover:border-belcar-500">
        <Link to={`/veiculos/${veiculo.chassi}`} className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-xs font-semibold text-ink">{veiculo.veiculo}</span>
          <span className="truncate font-mono text-[10px] text-muted">{veiculo.chassi}</span>
          {veiculo.cliente && <span className="truncate text-[11px] text-belcar-700" title={veiculo.cliente}>{veiculo.cliente}</span>}
        </Link>
        <FlagBadges veiculo={veiculo} />
        <div className="flex items-center justify-between gap-1 pt-0.5">
          <span className={`whitespace-nowrap text-[10px] ${days > 5 ? "font-medium text-danger" : "text-muted"}`} data-numeric>
            {days}d
          </span>
          <div className="flex gap-1">
            {isQualidade && (
              <Button size="sm" variant="destructive" className="h-6 px-1.5 text-[10px]" onClick={() => setRejectOpen(true)} title="Reprovar na Qualidade">
                <XCircle size={11} />
              </Button>
            )}
            {target && (
              <Button size="sm" variant="secondary" className="h-6 px-1.5 text-[10px]" onClick={() => setAdvanceOpen(true)} title={`Avançar para ${STAGE_LABELS[displayTarget ?? target]}`}>
                <ArrowRight size={11} /> Avançar
              </Button>
            )}
          </div>
        </div>
        <AdvanceStageDialog veiculo={veiculo} open={advanceOpen} onOpenChange={setAdvanceOpen} />
        {isQualidade && (
          <AdvanceStageDialog veiculo={veiculo} open={rejectOpen} onOpenChange={setRejectOpen} forcedTarget="05_em_preparacao" />
        )}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2 p-3 hover:border-belcar-500 transition-colors">
      <Link to={`/veiculos/${veiculo.chassi}`} className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">{veiculo.veiculo}</span>
          <span className="text-xs text-muted">{formatCurrency(veiculo.valor)}</span>
        </div>
        <span className="text-xs text-muted font-mono">{veiculo.chassi}</span>
        {veiculo.cliente && <span className="text-xs text-belcar-700">{veiculo.cliente}</span>}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{local ?? "—"}</span>
          <span>{responsavel ?? "Sem responsável"}</span>
        </div>
      </Link>

      <FlagBadges veiculo={veiculo} />

      <div className="flex items-center justify-between pt-1">
        <span className={`text-[11px] ${days > 5 ? "text-danger font-medium" : "text-muted"}`}>
          {days} {days === 1 ? "dia" : "dias"} no estágio
        </span>
        <div className="flex gap-1">
          {isQualidade && (
            <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
              <XCircle size={12} /> Reprovar
            </Button>
          )}
          {target && (
            <Button size="sm" variant="secondary" onClick={() => setAdvanceOpen(true)} title={`Avançar para ${STAGE_LABELS[displayTarget ?? target]}`}>
              <ArrowRight size={12} /> Avançar
            </Button>
          )}
        </div>
      </div>

      <AdvanceStageDialog veiculo={veiculo} open={advanceOpen} onOpenChange={setAdvanceOpen} />
      {isQualidade && (
        <AdvanceStageDialog
          veiculo={veiculo}
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          forcedTarget="05_em_preparacao"
        />
      )}
    </Card>
  );
}

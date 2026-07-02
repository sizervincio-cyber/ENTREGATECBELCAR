import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, List as ListIcon, ArrowRight } from "lucide-react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AdvanceStageDialog } from "@/components/AdvanceStageDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FlagBadges } from "@/components/FlagBadges";
import { Button } from "@/components/ui/button";
import { useVeiculos, useVendedores, useLocais } from "@/data/hooks";
import { PIPELINE_STAGES, nextStage, type Veiculo } from "@/types/domain";
import { daysSince, cn } from "@/lib/utils";

export function PainelPage() {
  const [view, setView] = useState<"kanban" | "lista">("kanban");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Painel de Entrega Técnica</h1>
          <p className="text-sm text-muted">
            Os 4 passos da operação. Documentação (04) e Qualidade (06) são checklist na hora de avançar —
            o histórico continua registrando estágio a estágio.
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-md border border-border p-1">
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={cn("rounded px-2 py-1", view === "kanban" ? "bg-belcar-100 text-belcar-900" : "text-muted")}
            aria-label="Visão Kanban"
            aria-pressed={view === "kanban"}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setView("lista")}
            className={cn("rounded px-2 py-1", view === "lista" ? "bg-belcar-100 text-belcar-900" : "text-muted")}
            aria-label="Visão Lista"
            aria-pressed={view === "lista"}
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {view === "kanban" ? <KanbanBoard /> : <PipelineLista />}
    </div>
  );
}

// Visão em lista do pipeline: só veículos em trabalho (01→08), ordenados por
// estágio e por tempo parado, com ação de avançar direto na linha.
function PipelineLista() {
  const veiculos = useVeiculos();
  const vendedores = useVendedores();
  const locais = useLocais();
  const [advanceChassi, setAdvanceChassi] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(100);

  const ativos = useMemo(() => {
    const ordemEstagio = new Map(PIPELINE_STAGES.map((s, i) => [s, i]));
    return veiculos
      .filter((v) => v.statusAtual !== "09_entregue" && v.statusAtual !== "10_encerrado")
      .sort((a, b) =>
        (ordemEstagio.get(a.statusAtual)! - ordemEstagio.get(b.statusAtual)!) ||
        (daysSince(b.updatedAt) - daysSince(a.updatedAt))
      );
  }, [veiculos]);

  const advanceVeiculo: Veiculo | undefined = ativos.find((v) => v.chassi === advanceChassi);
  const visiveis = ativos.slice(0, mostrar);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Estágio</th>
              <th className="px-3 py-2">Veículo</th>
              <th className="px-3 py-2">Chassi</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Local</th>
              <th className="px-3 py-2">Responsável</th>
              <th className="px-3 py-2">Dias</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((v) => {
              const dias = daysSince(v.updatedAt);
              return (
                <tr key={v.chassi} className="border-b border-border last:border-0 transition-colors hover:bg-background">
                  <td className="px-3 py-1.5"><StatusBadge status={v.statusAtual} /></td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium text-ink">{v.veiculo}</td>
                  <td className="px-3 py-1.5">
                    <Link to={`/veiculos/${v.chassi}`} className="font-mono text-xs text-belcar-700 hover:underline">{v.chassi}</Link>
                  </td>
                  <td className="max-w-48 truncate px-3 py-1.5 text-muted" title={v.cliente ?? undefined}>{v.cliente ?? "—"}</td>
                  <td className="px-3 py-1.5 text-muted">{locais.find((l) => l.id === v.localAtualId)?.nome ?? "—"}</td>
                  <td className={cn("px-3 py-1.5", v.responsavelId ? "text-muted" : "font-medium text-danger")}>
                    {vendedores.find((ve) => ve.id === v.responsavelId)?.nome ?? "Sem responsável"}
                  </td>
                  <td className={cn("px-3 py-1.5", dias > 5 ? "font-medium text-danger" : "text-muted")} data-numeric>{dias}</td>
                  <td className="px-3 py-1.5"><FlagBadges veiculo={v} /></td>
                  <td className="px-3 py-1.5 text-right">
                    {nextStage(v.statusAtual) && (
                      <Button size="sm" variant="secondary" onClick={() => setAdvanceChassi(v.chassi)}>
                        <ArrowRight size={12} /> Avançar
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ativos.length > visiveis.length && (
        <Button variant="outline" onClick={() => setMostrar((m) => m + 100)} className="self-center">
          Mostrar mais ({ativos.length - visiveis.length} restantes)
        </Button>
      )}

      {advanceVeiculo && (
        <AdvanceStageDialog
          veiculo={advanceVeiculo}
          open={!!advanceChassi}
          onOpenChange={(open) => { if (!open) setAdvanceChassi(null); }}
        />
      )}
    </div>
  );
}

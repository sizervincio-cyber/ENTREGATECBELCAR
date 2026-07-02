import { Link } from "react-router-dom";
import { STAGE_LABELS, type StatusPipeline } from "@/types/domain";
import { useVeiculos } from "@/data/hooks";
import { VehicleCard } from "@/components/VehicleCard";
import { cn } from "@/lib/utils";
import { PackageCheck } from "lucide-react";

// O funil visível segue os 4 passos que a operação reconhece da planilha.
// Os 10 estágios continuam existindo nos dados (R4 grava tudo), mas:
// - 04 e 06 são checklist na transição (só viram coluna se algo ficar retido);
// - 09/10 (entregue/encerrado) são histórico, não trabalho — viram um rodapé
//   com link, liberando a largura pra tudo caber na tela sem scroll lateral.
interface Passo {
  label: string;
  desc: string;
  stages: StatusPipeline[];
  headerClass: string;
  columnClass: string;
}

const PASSOS: Passo[] = [
  {
    label: "1 · Faturar",
    desc: "vender → NF",
    stages: ["01_aguardando_faturamento", "02_faturado"],
    headerClass: "border-fase1 text-fase1",
    columnClass: "bg-fase1-bg/40",
  },
  {
    label: "2 · Pátio",
    desc: "chegada + docs",
    stages: ["03_em_patio", "04_verificacao_documentacao"],
    headerClass: "border-belcar-600 text-belcar-700",
    columnClass: "bg-belcar-100/40",
  },
  {
    label: "3 · Preparar",
    desc: "tarefas + qualidade",
    stages: ["05_em_preparacao", "06_qualidade"],
    headerClass: "border-fase2 text-fase2",
    columnClass: "bg-fase2-bg/30",
  },
  {
    label: "4 · Entregar",
    desc: "agendar → entregar",
    stages: ["07_liberado", "08_agendado_cliente"],
    headerClass: "border-fase3 text-fase3",
    columnClass: "bg-fase3-bg/30",
  },
];

const CHECKLIST_STAGES = new Set<StatusPipeline>(["04_verificacao_documentacao", "06_qualidade"]);

// Colunas com volume alto mostram só os mais recentes — lista completa em /veiculos.
const CARDS_PER_COLUMN = 15;

export function KanbanBoard() {
  const veiculos = useVeiculos();

  const countOf = (s: StatusPipeline) => veiculos.filter((v) => v.statusAtual === s).length;
  const entregues = countOf("09_entregue");
  const encerrados = countOf("10_encerrado");

  const passosVisiveis = PASSOS.map((p) => ({
    ...p,
    visibleStages: p.stages.filter((s) => !CHECKLIST_STAGES.has(s) || countOf(s) > 0),
  }));
  const totalColunas = passosVisiveis.reduce((sum, p) => sum + p.visibleStages.length, 0);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid gap-x-2 gap-y-1.5"
        style={{ gridTemplateColumns: `repeat(${totalColunas}, minmax(0, 1fr))` }}
      >
        {/* Linha 1 — cabeçalhos dos passos, alinhados sobre suas colunas */}
        {passosVisiveis.map((p) => (
          <div
            key={p.label}
            className={cn("flex items-baseline gap-1.5 border-l-4 pl-2", p.headerClass)}
            style={{ gridColumn: `span ${p.visibleStages.length}` }}
          >
            <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide">{p.label}</h2>
            <span className="hidden truncate text-[11px] text-muted xl:inline">{p.desc}</span>
            <span className="ml-auto whitespace-nowrap text-[11px] font-medium text-muted" data-numeric>
              {p.stages.reduce((s, st) => s + countOf(st), 0)}
            </span>
          </div>
        ))}

        {/* Linha 2 — colunas de estágio, todas com a mesma largura */}
        {passosVisiveis.map((p) =>
          p.visibleStages.map((stage) => {
            const items = veiculos
              .filter((v) => v.statusAtual === stage)
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            const visible = items.slice(0, CARDS_PER_COLUMN);
            return (
              <div key={stage} className={cn("flex min-w-0 flex-col gap-1.5 rounded-lg p-1.5", p.columnClass)}>
                <div className="flex items-center justify-between gap-1 px-1">
                  <span className="truncate text-[11px] font-semibold text-ink" title={STAGE_LABELS[stage]}>
                    {STAGE_LABELS[stage]}
                    {CHECKLIST_STAGES.has(stage) && (
                      <span className="ml-1 rounded bg-warning-bg px-1 py-0.5 text-[10px] font-medium text-warning">retido</span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted" data-numeric>
                    {items.length}
                  </span>
                </div>
                <div className="flex max-h-[65vh] flex-col gap-1.5 overflow-y-auto">
                  {visible.map((v) => (
                    <VehicleCard key={v.chassi} veiculo={v} compact />
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-md border border-dashed border-border p-2 text-center text-[11px] text-muted">
                      Vazio
                    </div>
                  )}
                  {items.length > visible.length && (
                    <Link
                      to={`/veiculos?status=${stage}`}
                      className="rounded-md border border-dashed border-border p-1.5 text-center text-[11px] text-belcar-700 hover:bg-background"
                    >
                      +{items.length - visible.length} · ver todos →
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Estágios terminais — histórico, não trabalho */}
      <Link
        to="/entregues"
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:bg-background hover:text-ink"
      >
        <PackageCheck size={14} className="text-success" />
        <span data-numeric>
          <strong className="font-semibold text-ink">{entregues}</strong> entregues
          {encerrados > 0 && <> · <strong className="font-semibold text-ink">{encerrados}</strong> encerrados</>}
        </span>
        <span className="ml-auto text-xs">ver histórico →</span>
      </Link>
    </div>
  );
}

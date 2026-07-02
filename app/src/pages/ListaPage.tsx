import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useVeiculos, useVendedores, useLocais, useTarefas } from "@/data/hooks";
import { PIPELINE_STAGES, STAGE_LABELS, isCategoriaBloqueante, type StatusPipeline, type Veiculo } from "@/types/domain";
import { MultiSelect } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { FlagBadges } from "@/components/FlagBadges";
import { formatCurrency, formatDate, daysSince, cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X } from "lucide-react";

const PAGE_SIZE = 50;

// Filtros rápidos ativáveis por URL — são os destinos dos KPIs de alerta do
// Dashboard, então cada um replica exatamente o predicado usado lá.
type QuickFilter = "pendencias" | "bloqueio" | "sla" | "sem_responsavel" | "recall" | "nao_pago";

const QUICK_LABELS: Record<QuickFilter, string> = {
  pendencias: "Só pendências",
  bloqueio: "Bloqueio crítico",
  sla: "SLA vencido",
  sem_responsavel: "Sem responsável",
  recall: "Recall pendente",
  nao_pago: "Não pago",
};

type SortKey = "chassi" | "veiculo" | "cliente" | "statusAtual" | "dataFaturamento" | "valor" | "dias";
type SortDir = "asc" | "desc";

export function ListaPage() {
  const veiculos = useVeiculos();
  const vendedores = useVendedores();
  const locais = useLocais();
  const tarefas = useTarefas();
  const [searchParams] = useSearchParams();
  const statusFromUrl = searchParams.get("status");
  const initialStatus: string[] = statusFromUrl && PIPELINE_STAGES.includes(statusFromUrl as StatusPipeline)
    ? [statusFromUrl]
    : [];

  const initialQuick = new Set<QuickFilter>();
  if (searchParams.get("pendencias")) initialQuick.add("pendencias");
  if (searchParams.get("bloqueio")) initialQuick.add("bloqueio");
  if (searchParams.get("sla")) initialQuick.add("sla");
  if (searchParams.get("sem_responsavel")) initialQuick.add("sem_responsavel");
  if (searchParams.get("recall")) initialQuick.add("recall");
  if (searchParams.get("nao_pago")) initialQuick.add("nao_pago");

  const localFromUrl = searchParams.get("local");

  const [busca, setBusca] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<Set<string>>(new Set(initialStatus));
  const [vendedorIds, setVendedorIds] = useState<Set<string>>(new Set());
  const [localIds, setLocalIds] = useState<Set<string>>(new Set(localFromUrl ? [localFromUrl] : []));
  const [quick, setQuick] = useState<Set<QuickFilter>>(initialQuick);
  const [sortKey, setSortKey] = useState<SortKey>("dias");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const toggleQuick = (f: QuickFilter) => {
    setQuick((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
    setPage(0);
  };

  const filtrados = useMemo(() => {
    const emAndamento = (v: Veiculo) => v.statusAtual !== "09_entregue" && v.statusAtual !== "10_encerrado";
    return veiculos.filter((v) => {
      if (status.size > 0 && !status.has(v.statusAtual)) return false;
      if (vendedorIds.size > 0 && (!v.vendedorId || !vendedorIds.has(v.vendedorId))) return false;
      if (localIds.size > 0 && (!v.localAtualId || !localIds.has(v.localAtualId))) return false;
      if (quick.has("pendencias")) {
        const temPendencia =
          v.avariado || v.pendenciaBateria || v.pendenciaOficina || v.nfCancelada ||
          !v.pago || v.recallStatus === "tem" || v.recallStatus === "em_servico";
        if (!temPendencia) return false;
      }
      if (quick.has("bloqueio")) {
        const bloqueado = v.avariado || v.nfCancelada ||
          tarefas.some((t) => t.chassi === v.chassi && t.status === "bloqueada" && isCategoriaBloqueante(t.categoria));
        if (!bloqueado) return false;
      }
      if (quick.has("sla") && !(emAndamento(v) && daysSince(v.updatedAt) > 5)) return false;
      if (quick.has("sem_responsavel")) {
        const sem = !v.responsavelId ||
          tarefas.some((t) => t.chassi === v.chassi && t.status !== "concluida" && !t.responsavelId);
        if (!sem) return false;
      }
      if (quick.has("recall") && !(v.recallStatus === "tem" || v.recallStatus === "em_servico")) return false;
      if (quick.has("nao_pago") && v.pago) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!v.chassi.toLowerCase().includes(q) && !v.veiculo.toLowerCase().includes(q) && !(v.cliente ?? "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [veiculos, tarefas, status, vendedorIds, localIds, quick, busca]);

  const ordenados = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (v: Veiculo): string | number => {
      switch (sortKey) {
        case "chassi": return v.chassi;
        case "veiculo": return v.veiculo;
        case "cliente": return v.cliente ?? "";
        case "statusAtual": return v.statusAtual;
        case "dataFaturamento": return v.dataFaturamento ?? "";
        case "valor": return v.valor ?? -1;
        case "dias": return daysSince(v.updatedAt);
      }
    };
    return [...filtrados].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR") * dir;
    });
  }, [filtrados, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(ordenados.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagina = ordenados.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "valor" || key === "dias" || key === "dataFaturamento" ? "desc" : "asc");
    }
    setPage(0);
  };

  const filtrosAtivos = quick.size > 0 || status.size > 0 || vendedorIds.size > 0 || localIds.size > 0 || busca !== "";
  const limparTodos = () => {
    setQuick(new Set());
    setStatus(new Set());
    setVendedorIds(new Set());
    setLocalIds(new Set());
    setBusca("");
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Veículos</h1>
        <p className="text-sm text-muted" data-numeric>{filtrados.length} de {veiculos.length} veículos</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por chassi, modelo ou cliente..."
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPage(0); }}
          className="w-64"
        />

        <MultiSelect
          className="w-52"
          placeholder="Todos os estágios"
          options={PIPELINE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
          selected={status}
          onChange={(next) => { setStatus(next); setPage(0); }}
        />

        <MultiSelect
          className="w-44"
          placeholder="Todos os vendedores"
          options={vendedores.map((v) => ({ value: v.id, label: v.nome }))}
          selected={vendedorIds}
          onChange={(next) => { setVendedorIds(next); setPage(0); }}
        />

        <MultiSelect
          className="w-44"
          placeholder="Todos os locais"
          options={locais.map((l) => ({ value: l.id, label: l.nome }))}
          selected={localIds}
          onChange={(next) => { setLocalIds(next); setPage(0); }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(QUICK_LABELS) as QuickFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => toggleQuick(f)}
            aria-pressed={quick.has(f)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
              quick.has(f)
                ? "border-danger bg-danger-bg text-danger"
                : "border-border bg-surface text-muted hover:bg-background hover:text-ink"
            )}
          >
            {QUICK_LABELS[f]}
          </button>
        ))}
        {filtrosAtivos && (
          <button
            type="button"
            onClick={limparTodos}
            className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-ink"
          >
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <SortableTh label="Chassi" k="chassi" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Veículo" k="veiculo" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Cliente" k="cliente" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Estágio" k="statusAtual" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th className="px-3 py-2">Local</th>
              <th className="px-3 py-2">Vendedor</th>
              <SortableTh label="Faturamento" k="dataFaturamento" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Valor" k="valor" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Dias no estágio" k="dias" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th className="px-3 py-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map((v) => {
              const dias = daysSince(v.updatedAt);
              const emAndamento = v.statusAtual !== "09_entregue" && v.statusAtual !== "10_encerrado";
              return (
                <tr key={v.chassi} className="border-b border-border last:border-0 transition-colors hover:bg-background">
                  <td className="px-3 py-2">
                    <Link to={`/veiculos/${v.chassi}`} className="font-mono text-xs text-belcar-700 hover:underline">
                      {v.chassi}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{v.veiculo}</td>
                  <td className="px-3 py-2 text-muted">{v.cliente ?? "—"}</td>
                  <td className="px-3 py-2"><StatusBadge status={v.statusAtual} /></td>
                  <td className="px-3 py-2 text-muted">{locais.find((l) => l.id === v.localAtualId)?.nome ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{vendedores.find((ve) => ve.id === v.vendedorId)?.nome ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{formatDate(v.dataFaturamento)}</td>
                  <td className="px-3 py-2 text-muted">{formatCurrency(v.valor)}</td>
                  <td className={cn("px-3 py-2", emAndamento && dias > 5 ? "font-medium text-danger" : "text-muted")}>
                    {dias}
                  </td>
                  <td className="px-3 py-2"><FlagBadges veiculo={v} /></td>
                </tr>
              );
            })}
            {pagina.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted">
                  Nenhum veículo encontrado com estes filtros.
                  {filtrosAtivos && (
                    <button type="button" onClick={limparTodos} className="ml-2 font-medium text-belcar-700 hover:underline">
                      Limpar filtros
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ordenados.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted" data-numeric>
            Mostrando {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, ordenados.length)} de {ordenados.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft size={14} /> Anterior
            </Button>
            <span className="text-sm text-muted" data-numeric>{safePage + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
              Próxima <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableTh({
  label, k, sortKey, sortDir, onSort,
}: {
  label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = k === sortKey;
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 uppercase transition-colors hover:text-ink",
          active ? "text-ink" : "text-muted"
        )}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
      >
        {label}
        {active && (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );
}

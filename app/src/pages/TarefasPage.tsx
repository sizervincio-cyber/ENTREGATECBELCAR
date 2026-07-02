import { useMemo, useState } from "react";
import { LayoutGrid, List as ListIcon, Plus } from "lucide-react";
import { useTarefas, useVendedores } from "@/data/hooks";
import {
  TAREFA_STATUS_ORDER, TAREFA_STATUS_LABELS, TAREFA_CATEGORIA_LABELS, TAREFA_PRIORIDADE_LABELS,
  type TarefaCategoria, type TarefaPrioridade, type TarefaStatus,
} from "@/types/domain";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TarefaCard } from "@/components/TarefaCard";
import { TarefaDrawer } from "@/components/TarefaDrawer";
import { CreateTarefaModal } from "@/components/CreateTarefaModal";
import { TarefaStatusBadge, TarefaPrioridadeBadge, TarefaCategoriaBadge } from "@/components/TarefaBadges";
import { formatDate, formatCurrency, urgenciaPrazo } from "@/lib/utils";

const ALL = "__all__";
const CARDS_PER_COLUMN = 25;

export function TarefasPage() {
  const tarefas = useTarefas();
  const vendedores = useVendedores();

  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState(ALL);
  const [responsavelId, setResponsavelId] = useState(ALL);
  const [prioridade, setPrioridade] = useState(ALL);
  const [openTarefaId, setOpenTarefaId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (categoria !== ALL && t.categoria !== categoria) return false;
      if (responsavelId !== ALL && t.responsavelId !== responsavelId) return false;
      if (prioridade !== ALL && t.prioridade !== prioridade) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!t.titulo.toLowerCase().includes(q) && !t.chassi.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tarefas, categoria, responsavelId, prioridade, busca]);

  const vencidas = filtradas.filter((t) => t.status !== "concluida" && urgenciaPrazo(t.prazo) === "vencido").length;
  const hoje = filtradas.filter((t) => t.status !== "concluida" && urgenciaPrazo(t.prazo) === "hoje").length;
  const custoTotal = filtradas.reduce((sum, t) => sum + (t.valor ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">Preparação Técnica / Tarefas</h1>
          <p className="text-sm text-muted">{filtradas.length} tarefas · {vencidas} vencidas · {hoje} vencem hoje · custo total {formatCurrency(custoTotal)}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Nova tarefa
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar por título ou chassi..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />

        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {(Object.keys(TAREFA_CATEGORIA_LABELS) as TarefaCategoria[]).map((c) => (
              <SelectItem key={c} value={c}>{TAREFA_CATEGORIA_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={responsavelId} onValueChange={setResponsavelId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
            {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={prioridade} onValueChange={setPrioridade}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as prioridades</SelectItem>
            {(Object.keys(TAREFA_PRIORIDADE_LABELS) as TarefaPrioridade[]).map((p) => (
              <SelectItem key={p} value={p}>{TAREFA_PRIORIDADE_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-1 rounded-md border border-border p-1">
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`rounded px-2 py-1 ${view === "kanban" ? "bg-belcar-100 text-belcar-900" : "text-muted"}`}
            aria-label="Visão Kanban"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setView("lista")}
            className={`rounded px-2 py-1 ${view === "lista" ? "bg-belcar-100 text-belcar-900" : "text-muted"}`}
            aria-label="Visão Lista"
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${TAREFA_STATUS_ORDER.length}, minmax(240px, 1fr))` }}>
          {TAREFA_STATUS_ORDER.map((status: TarefaStatus) => {
            const items = filtradas.filter((t) => t.status === status);
            const visible = items.slice(0, CARDS_PER_COLUMN);
            return (
              <div key={status} className="flex flex-col gap-2 rounded-lg bg-fase1-bg/40 p-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-ink">{TAREFA_STATUS_LABELS[status]}</span>
                  <span className="text-xs text-muted">{items.length}</span>
                </div>
                <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
                  {visible.map((t) => <TarefaCard key={t.id} tarefa={t} onOpen={setOpenTarefaId} />)}
                  {items.length === 0 && (
                    <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted">Vazio</div>
                  )}
                  {items.length > visible.length && (
                    <p className="text-center text-xs text-muted">+ {items.length - visible.length} tarefas</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Chassi</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Prioridade</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Prazo</th>
                <th className="px-3 py-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((t) => (
                <tr key={t.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-background" onClick={() => setOpenTarefaId(t.id)}>
                  <td className="px-3 py-2 font-medium text-ink">{t.titulo}</td>
                  <td className="px-3 py-2 font-mono text-xs text-belcar-700">{t.chassi}</td>
                  <td className="px-3 py-2"><TarefaCategoriaBadge categoria={t.categoria} /></td>
                  <td className="px-3 py-2"><TarefaStatusBadge status={t.status} /></td>
                  <td className="px-3 py-2"><TarefaPrioridadeBadge prioridade={t.prioridade} /></td>
                  <td className="px-3 py-2 text-muted">{vendedores.find((v) => v.id === t.responsavelId)?.nome ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{t.prazo ? formatDate(t.prazo) : "—"}</td>
                  <td className="px-3 py-2 text-muted">{formatCurrency(t.valor)}</td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted">Nenhuma tarefa encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {openTarefaId && <TarefaDrawer tarefaId={openTarefaId} onClose={() => setOpenTarefaId(null)} />}
      <CreateTarefaModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

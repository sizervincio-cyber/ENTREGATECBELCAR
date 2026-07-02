import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useVeiculos, useVendedores, useLocais } from "@/data/hooks";
import { updateVeiculo, clienteEditavel } from "@/data/store";
import {
  PIPELINE_STAGES, STAGE_LABELS, RECALL_LABELS,
  type RecallStatus, type Veiculo,
} from "@/types/domain";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const ALL = "__all__";
const NONE = "__none__";
const PAGE_SIZE = 50;

// Modo Planilha — a grade de trabalho no formato da aba ESTOQUE, com edição
// inline dos campos quentes (local, vendedor, responsável, NF, data, pago,
// recall, obs). É a ponte de adoção: a pessoa que vive na planilha reconhece
// esta tela no primeiro segundo e edita sem abrir dialog.
export function PlanilhaPage() {
  const veiculos = useVeiculos();
  const vendedores = useVendedores();
  const locais = useLocais();
  const [searchParams] = useSearchParams();

  const [busca, setBusca] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const [savingCount, setSavingCount] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);

  // Contador global de saves em andamento — mostra "Salvando…"/"Salvo" no header,
  // feedback que a planilha dá de graça e o usuário sente falta.
  const trackSave = async (p: Promise<unknown>) => {
    setSavingCount((c) => c + 1);
    try {
      await p;
    } finally {
      setSavingCount((c) => c - 1);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }
  };

  const filtrados = useMemo(() => {
    return veiculos
      .filter((v) => {
        if (status !== ALL && v.statusAtual !== status) return false;
        if (busca) {
          const q = busca.toLowerCase();
          if (!v.chassi.toLowerCase().includes(q) && !v.veiculo.toLowerCase().includes(q) && !(v.cliente ?? "").toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => (a.cliente ?? "￿").localeCompare(b.cliente ?? "￿", "pt-BR") || a.chassi.localeCompare(b.chassi));
  }, [veiculos, status, busca]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagina = filtrados.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Modo Planilha</h1>
          <p className="text-sm text-muted" data-numeric>
            A grade da aba ESTOQUE, editável direto na célula — {filtrados.length} de {veiculos.length} veículos, ordenados por cliente
          </p>
        </div>
        <div className="flex h-9 items-center gap-1.5 text-sm" aria-live="polite">
          {savingCount > 0 ? (
            <>
              <Loader2 size={14} className="animate-spin text-belcar-600" />
              <span className="text-muted">Salvando…</span>
            </>
          ) : savedFlash ? (
            <>
              <Check size={14} className="text-success" />
              <span className="text-success">Salvo</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por chassi, modelo ou cliente..."
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPage(0); }}
          className="w-64"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Estágio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os estágios</SelectItem>
            {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Chassi</th>
              <th className="px-3 py-2">Veículo</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Estágio</th>
              <th className="px-3 py-2">Local</th>
              <th className="px-3 py-2">Vendedor</th>
              <th className="px-3 py-2">Responsável</th>
              <th className="px-3 py-2">NF</th>
              <th className="px-3 py-2">Data fat.</th>
              <th className="px-3 py-2">Pago</th>
              <th className="px-3 py-2">Recall</th>
              <th className="px-3 py-2" title="Custo da nota de entrada no estoque">Custo entrada</th>
              <th className="px-3 py-2" title="Valor da nota de saída ao cliente">Nota saída</th>
              <th className="min-w-56 px-3 py-2">Obs</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map((v) => (
              <PlanilhaRow key={v.chassi} veiculo={v} vendedores={vendedores} locais={locais} trackSave={trackSave} />
            ))}
            {pagina.length === 0 && (
              <tr><td colSpan={14} className="px-3 py-10 text-center text-muted">Nenhum veículo encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {filtrados.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted" data-numeric>
            Mostrando {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtrados.length)} de {filtrados.length}
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

interface RowProps {
  veiculo: Veiculo;
  vendedores: { id: string; nome: string }[];
  locais: { id: string; nome: string }[];
  trackSave: (p: Promise<unknown>) => void;
}

function PlanilhaRow({ veiculo: v, vendedores, locais, trackSave }: RowProps) {
  const patch = (p: Parameters<typeof updateVeiculo>[0]["patch"]) =>
    trackSave(updateVeiculo({ chassi: v.chassi, patch: p }));

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-background/60">
      <td className="px-3 py-1.5">
        <Link to={`/veiculos/${v.chassi}`} className="font-mono text-xs text-belcar-700 hover:underline">
          {v.chassi}
        </Link>
      </td>
      <td className="whitespace-nowrap px-3 py-1.5">{v.veiculo}</td>
      <td className="max-w-44 px-3 py-1.5">
        {clienteEditavel(v) ? (
          <CellText
            value={v.cliente}
            onSave={(cliente) => patch({ cliente })}
            placeholder="Adicionar cliente..."
            className="w-40 text-xs"
            ariaLabel={`Cliente de ${v.chassi} (editável até faturar)`}
          />
        ) : (
          <span className="block truncate text-muted" title={v.cliente ? `${v.cliente} — cliente travado após o faturamento` : "Cliente só é editável antes do faturamento"}>
            {v.cliente ?? "—"}
          </span>
        )}
      </td>
      <td className="px-3 py-1.5"><StatusBadge status={v.statusAtual} /></td>
      <td className="px-1 py-1.5">
        <CellSelect
          value={v.localAtualId}
          options={locais.map((l) => ({ value: l.id, label: l.nome }))}
          onChange={(localAtualId) => patch({ localAtualId })}
          ariaLabel={`Local de ${v.chassi}`}
        />
      </td>
      <td className="px-1 py-1.5">
        <CellSelect
          value={v.vendedorId}
          options={vendedores.map((ve) => ({ value: ve.id, label: ve.nome }))}
          onChange={(vendedorId) => patch({ vendedorId })}
          ariaLabel={`Vendedor de ${v.chassi}`}
        />
      </td>
      <td className="px-1 py-1.5">
        <CellSelect
          value={v.responsavelId}
          options={vendedores.map((ve) => ({ value: ve.id, label: ve.nome }))}
          onChange={(responsavelId) => patch({ responsavelId })}
          ariaLabel={`Responsável de ${v.chassi}`}
          emptyLabel="Sem resp."
          highlightEmpty
        />
      </td>
      <td className="px-1 py-1.5">
        <CellText
          value={v.nf}
          onSave={(nf) => patch({ nf })}
          placeholder="NF"
          className="w-24 font-mono text-xs"
          ariaLabel={`NF de ${v.chassi}`}
        />
      </td>
      <td className="px-1 py-1.5">
        <CellDate
          value={v.dataFaturamento}
          onSave={(dataFaturamento) => patch({ dataFaturamento })}
          ariaLabel={`Data de faturamento de ${v.chassi}`}
        />
      </td>
      <td className="px-1 py-1.5">
        <button
          type="button"
          onClick={() => patch({ pago: !v.pago })}
          aria-pressed={v.pago}
          title="Clique para alternar"
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
            v.pago ? "bg-success-bg text-success hover:bg-success-bg/70" : "bg-warning-bg text-warning hover:bg-warning-bg/70"
          )}
        >
          {v.pago ? "PAGO" : "NÃO"}
        </button>
      </td>
      <td className="px-1 py-1.5">
        <CellSelect
          value={v.recallStatus}
          options={(Object.keys(RECALL_LABELS) as RecallStatus[]).map((r) => ({ value: r, label: RECALL_LABELS[r] }))}
          onChange={(recallStatus) => patch({ recallStatus: (recallStatus ?? "nao_tem") as RecallStatus })}
          ariaLabel={`Recall de ${v.chassi}`}
          clearable={false}
          danger={v.recallStatus === "tem" || v.recallStatus === "em_servico"}
        />
      </td>
      <td className="px-1 py-1.5">
        <CellMoney
          value={v.custoNotaEntrada ?? null}
          onSave={(custoNotaEntrada) => patch({ custoNotaEntrada })}
          ariaLabel={`Custo da nota de entrada de ${v.chassi}`}
        />
      </td>
      <td className="px-1 py-1.5">
        <CellMoney
          value={v.valorNotaSaida ?? null}
          onSave={(valorNotaSaida) => patch({ valorNotaSaida })}
          ariaLabel={`Valor da nota de saída de ${v.chassi}`}
        />
      </td>
      <td className="px-1 py-1.5">
        <CellText
          value={v.observacoes}
          onSave={(observacoes) => patch({ observacoes })}
          placeholder="Adicionar obs..."
          className="w-full min-w-52 text-xs"
          ariaLabel={`Observações de ${v.chassi}`}
        />
      </td>
    </tr>
  );
}

// Select nativo estilizado como célula de planilha — leve o bastante pra
// renderizar 50 linhas × 4 selects sem custo perceptível.
function CellSelect({
  value, options, onChange, ariaLabel, emptyLabel = "—", clearable = true, highlightEmpty = false, danger = false,
}: {
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
  ariaLabel: string;
  emptyLabel?: string;
  clearable?: boolean;
  highlightEmpty?: boolean;
  danger?: boolean;
}) {
  return (
    <select
      value={value ?? NONE}
      onChange={(e) => onChange(e.target.value === NONE ? null : e.target.value)}
      aria-label={ariaLabel}
      className={cn(
        "h-7 max-w-36 cursor-pointer truncate rounded border border-transparent bg-transparent px-1 text-xs text-ink transition-colors hover:border-border hover:bg-surface focus:border-belcar-500 focus:outline-none",
        highlightEmpty && !value && "text-danger font-medium",
        danger && "text-danger font-medium"
      )}
    >
      {(clearable || !value) && <option value={NONE}>{emptyLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// Texto editável in-place: mostra o valor; clique vira input; Enter/blur salva,
// Esc cancela. Espelha o gesto de editar célula na planilha.
function CellText({
  value, onSave, placeholder, className, ariaLabel,
}: {
  value: string | null;
  onSave: (value: string | null) => void;
  placeholder: string;
  className?: string;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "")) onSave(trimmed || null);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={ariaLabel}
        title={value ?? undefined}
        className={cn(
          "block h-7 truncate rounded border border-transparent px-1.5 text-left transition-colors hover:border-border hover:bg-surface focus-visible:border-belcar-500 focus-visible:outline-none",
          !value && "text-muted",
          className
        )}
      >
        {value || placeholder}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
      }}
      aria-label={ariaLabel}
      className={cn("h-7 rounded border border-belcar-500 bg-surface px-1.5 text-ink focus:outline-none", className)}
    />
  );
}

// Valor em reais editável in-place: mostra formatado, clique vira input
// numérico; aceita "12345,67" ou "12345.67".
function CellMoney({
  value, onSave, ariaLabel,
}: {
  value: number | null;
  onSave: (value: number | null) => void;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    setEditing(false);
    const raw = draft.trim().replace(/\./g, "").replace(",", ".");
    if (raw === "") {
      if (value != null) onSave(null);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed) && parsed !== value) onSave(parsed);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setDraft(value != null ? String(value).replace(".", ",") : ""); setEditing(true); }}
        aria-label={ariaLabel}
        className={cn(
          "block h-7 whitespace-nowrap rounded border border-transparent px-1.5 text-left text-xs transition-colors hover:border-border hover:bg-surface focus-visible:border-belcar-500 focus-visible:outline-none",
          value == null && "text-muted"
        )}
        data-numeric
      >
        {value != null ? formatCurrency(value) : "—"}
      </button>
    );
  }

  return (
    <input
      autoFocus
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      aria-label={ariaLabel}
      placeholder="0,00"
      className="h-7 w-24 rounded border border-belcar-500 bg-surface px-1.5 text-xs text-ink focus:outline-none"
    />
  );
}

function CellDate({
  value, onSave, ariaLabel,
}: {
  value: string | null;
  onSave: (value: string | null) => void;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={ariaLabel}
        className={cn(
          "block h-7 whitespace-nowrap rounded border border-transparent px-1.5 text-left text-xs transition-colors hover:border-border hover:bg-surface focus-visible:border-belcar-500 focus-visible:outline-none",
          !value && "text-muted"
        )}
      >
        {value ? formatDate(value) : "—"}
      </button>
    );
  }

  return (
    <input
      type="date"
      autoFocus
      defaultValue={value ?? ""}
      onBlur={(e) => { setEditing(false); const nv = e.target.value || null; if (nv !== value) onSave(nv); }}
      onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
      aria-label={ariaLabel}
      className="h-7 w-32 rounded border border-belcar-500 bg-surface px-1 text-xs text-ink focus:outline-none"
    />
  );
}

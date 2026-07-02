import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVeiculos } from "@/data/hooks";
import { StatusBadge } from "@/components/StatusBadge";
import { Search } from "lucide-react";

const MAX_RESULTS = 8;

// Busca global por chassi, modelo ou cliente — atalho Ctrl+K / ⌘K.
// Enter no resultado navega direto pra tela de detalhe do veículo.
export function GlobalSearch() {
  const veiculos = useVeiculos();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return veiculos
      .filter(
        (v) =>
          v.chassi.toLowerCase().includes(q) ||
          v.veiculo.toLowerCase().includes(q) ||
          (v.cliente ?? "").toLowerCase().includes(q)
      )
      .slice(0, MAX_RESULTS);
  }, [veiculos, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => setHighlighted(0), [query]);

  const goTo = (chassi: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/veiculos/${chassi}`);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlighted]) {
        goTo(results[highlighted].chassi);
      } else if (query.trim().length >= 2) {
        setOpen(false);
        navigate(`/veiculos?q=${encodeURIComponent(query.trim())}`);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-label="Buscar veículo por chassi, modelo ou cliente"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onInputKeyDown}
        placeholder="Buscar chassi, modelo ou cliente..."
        className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-14 text-sm text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-belcar-500 transition-colors"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
        Ctrl K
      </kbd>

      {open && query.trim().length >= 2 && (
        <div className="animate-page-in absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted">Nenhum veículo encontrado para “{query.trim()}”.</p>
          )}
          {results.map((v, i) => (
            <button
              key={v.chassi}
              type="button"
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => goTo(v.chassi)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                i === highlighted ? "bg-belcar-100" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-ink">{v.veiculo}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted">{v.chassi}</span>
                </div>
                {v.cliente && <p className="truncate text-xs text-belcar-700">{v.cliente}</p>}
              </div>
              <StatusBadge status={v.statusAtual} className="shrink-0" />
            </button>
          ))}
          {results.length > 0 && (
            <p className="border-t border-border bg-background px-3 py-1.5 text-[11px] text-muted">
              ↑↓ navegar · Enter abrir · Esc fechar
            </p>
          )}
        </div>
      )}
    </div>
  );
}

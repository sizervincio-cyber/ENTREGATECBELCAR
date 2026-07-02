import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, X } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

// Filtro de seleção múltipla: dropdown leve com checkboxes e busca.
// Conjunto vazio = "todos" (nenhum filtro aplicado).
export function MultiSelect({
  options, selected, onChange, placeholder, className, searchable = true,
}: {
  options: MultiSelectOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  placeholder: string;
  className?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const summary =
    selected.size === 0
      ? placeholder
      : selected.size === 1
        ? options.find((o) => selected.has(o.value))?.label ?? placeholder
        : `${selected.size} selecionados`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={placeholder}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-1 rounded-md border border-border bg-surface px-3 text-sm transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-belcar-500",
          selected.size > 0 ? "font-medium text-belcar-900" : "text-muted"
        )}
      >
        <span className="truncate">{summary}</span>
        <span className="flex shrink-0 items-center gap-1">
          {selected.size > 0 && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpar seleção"
              onClick={(e) => { e.stopPropagation(); onChange(new Set()); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(new Set()); } }}
              className="rounded-full p-0.5 hover:bg-belcar-100"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="animate-page-in absolute left-0 z-50 mt-1 max-h-72 w-full min-w-48 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          {searchable && options.length > 8 && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar..."
              className="w-full border-b border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          )}
          <div className="max-h-56 overflow-y-auto p-1">
            {visible.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted">Nada encontrado.</p>}
            {visible.map((o) => {
              const active = selected.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-background",
                    active && "font-medium text-belcar-900"
                  )}
                >
                  <span className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    active ? "border-belcar-700 bg-belcar-700 text-white" : "border-border bg-surface"
                  )}>
                    {active && <Check size={11} />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

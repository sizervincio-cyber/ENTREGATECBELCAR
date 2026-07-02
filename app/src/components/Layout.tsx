import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  Gauge, LayoutGrid, List, Truck, CalendarDays, Wrench, CheckSquare, DollarSign,
  Wand2, PackageCheck, Settings2, BarChart3, GitBranch, Table2,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Gauge;
  end?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Visão Geral",
    items: [
      { to: "/", label: "Dashboard", icon: Gauge, end: true },
      { to: "/pipeline", label: "Pipeline", icon: LayoutGrid },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/planilha", label: "Modo Planilha", icon: Table2 },
      { to: "/veiculos", label: "Veículos", icon: List },
      { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
      { to: "/faturamento", label: "Faturamento", icon: DollarSign },
      { to: "/movimentacao", label: "Movimentação", icon: Truck },
      { to: "/agenda", label: "Agenda de Entrega", icon: CalendarDays },
      { to: "/agenda-acessorios", label: "Agenda de Acessórios", icon: Wand2 },
      { to: "/entregues", label: "Entregues", icon: PackageCheck },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/cadastros", label: "Cadastros", icon: Settings2 },
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/fluxograma", label: "Fluxograma do Sistema", icon: GitBranch },
    ],
  },
];

export function Layout() {
  const location = useLocation();
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 flex h-svh w-60 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-surface p-4">
        <div className="mb-1 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-belcar-700 text-white">
            <Wrench size={16} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-belcar-900">Belcar</span>
            <span className="text-[11px] text-muted">Torre de Controle</span>
          </div>
        </div>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{group.label}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-background hover:text-ink",
                    isActive && "bg-belcar-100 text-belcar-900"
                  )
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface/95 px-6 backdrop-blur">
          <GlobalSearch />
        </header>
        <main key={location.pathname} className="animate-page-in flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

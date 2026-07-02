import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVeiculos, useVendedores, useLocais, useTarefas, useMovimentacoes, useAgendaEntregas } from "@/data/hooks";
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_FASE, FASE_LABELS, isCategoriaBloqueante, type Fase } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { EntregasHeatmap, CustoMensalChart, LocaisChart, DiasPorEtapaChart } from "@/components/DashboardCharts";
import { Input, Label } from "@/components/ui/input";
import { daysSince } from "@/lib/utils";
import {
  AlertTriangle, Truck, FileText, MapPin, Wrench, DollarSign, PackageCheck,
  Calendar, UserX, ShieldAlert, Clock, X, FilterX,
} from "lucide-react";

export function DashboardPage() {
  const veiculos = useVeiculos();
  const vendedores = useVendedores();
  const locais = useLocais();
  const tarefas = useTarefas();
  const movimentacoes = useMovimentacoes();
  const agendaEntregas = useAgendaEntregas();

  const [vendedorIds, setVendedorIds] = useState<Set<string>>(new Set());
  const [localIds, setLocalIds] = useState<Set<string>>(new Set());
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set());
  const [responsavelIds, setResponsavelIds] = useState<Set<string>>(new Set());
  const [cliente, setCliente] = useState("");
  const [modelo, setModelo] = useState("");
  const [faturamentoDe, setFaturamentoDe] = useState("");
  const [faturamentoAte, setFaturamentoAte] = useState("");

  const filtrados = useMemo(() => {
    return veiculos.filter((v) => {
      if (vendedorIds.size > 0 && (!v.vendedorId || !vendedorIds.has(v.vendedorId))) return false;
      if (localIds.size > 0 && (!v.localAtualId || !localIds.has(v.localAtualId))) return false;
      if (statusSel.size > 0 && !statusSel.has(v.statusAtual)) return false;
      if (responsavelIds.size > 0 && (!v.responsavelId || !responsavelIds.has(v.responsavelId))) return false;
      if (cliente && !(v.cliente ?? "").toLowerCase().includes(cliente.toLowerCase())) return false;
      if (modelo && !v.veiculo.toLowerCase().includes(modelo.toLowerCase())) return false;
      if (faturamentoDe && (!v.dataFaturamento || v.dataFaturamento < faturamentoDe)) return false;
      if (faturamentoAte && (!v.dataFaturamento || v.dataFaturamento > faturamentoAte)) return false;
      return true;
    });
  }, [veiculos, vendedorIds, localIds, statusSel, responsavelIds, cliente, modelo, faturamentoDe, faturamentoAte]);

  const chassisFiltrados = useMemo(() => new Set(filtrados.map((v) => v.chassi)), [filtrados]);
  const tarefasFiltradas = tarefas.filter((t) => chassisFiltrados.has(t.chassi));
  const movimentacoesFiltradas = movimentacoes.filter((m) => chassisFiltrados.has(m.chassi));
  const agendaFiltrada = agendaEntregas.filter((a) => chassisFiltrados.has(a.chassi));

  const count = (stage: string) => filtrados.filter((v) => v.statusAtual === stage).length;

  const emAndamento = filtrados.filter((v) => v.statusAtual !== "09_entregue" && v.statusAtual !== "10_encerrado");

  const pendenciaAcessorios = tarefasFiltradas.filter((t) => t.categoria === "acessorio" && t.status !== "concluida").length;
  const comRecall = filtrados.filter((v) => v.recallStatus === "tem" || v.recallStatus === "em_servico").length;
  const pendenciaPagamento = filtrados.filter((v) => !v.pago).length;
  const emMovimentacao = movimentacoesFiltradas.filter((m) => m.prioridade !== "6_finalizado").length;
  const chassisComAgenda = new Set(agendaFiltrada.map((a) => a.chassi));
  const aguardandoAgenda = filtrados.filter((v) => v.statusAtual === "07_liberado" && !chassisComAgenda.has(v.chassi)).length;

  const slaAlerta = emAndamento
    .filter((v) => daysSince(v.updatedAt) > 5)
    .sort((a, b) => daysSince(b.updatedAt) - daysSince(a.updatedAt));

  const semResponsavel = filtrados.filter(
    (v) => !v.responsavelId || tarefasFiltradas.some((t) => t.chassi === v.chassi && t.status !== "concluida" && !t.responsavelId)
  ).length;

  const bloqueioCritico = filtrados.filter((v) =>
    v.avariado || v.nfCancelada ||
    tarefasFiltradas.some((t) => t.chassi === v.chassi && t.status === "bloqueada" && isCategoriaBloqueante(t.categoria))
  ).length;

  const fases: Fase[] = ["fluxo_interno", "controle", "entrega"];
  const totalPorFase = fases.map((f) => ({ fase: f, count: filtrados.filter((v) => STAGE_FASE[v.statusAtual] === f).length }));

  // Estágios ativos numa escala própria — Entregue/Encerrado (histórico de anos)
  // esmagaria a barra dos demais se dividisse a mesma régua.
  const estagiosAtivos = PIPELINE_STAGES.filter((s) => s !== "09_entregue" && s !== "10_encerrado");
  const porEstagio = estagiosAtivos.map((s) => ({ stage: s, count: count(s) }));
  const maxCount = Math.max(1, ...porEstagio.map((p) => p.count));

  const alertasCriticos = [
    ...filtrados.filter((v) => v.nfCancelada).map((v) => ({ chassi: v.chassi, texto: `${v.veiculo} — NF cancelada`, nivel: 0 })),
    ...filtrados.filter((v) => v.avariado).map((v) => ({ chassi: v.chassi, texto: `${v.veiculo} — avariado`, nivel: 1 })),
    ...filtrados.filter((v) => !v.responsavelId && v.statusAtual !== "09_entregue" && v.statusAtual !== "10_encerrado")
      .map((v) => ({ chassi: v.chassi, texto: `${v.veiculo} — sem responsável`, nivel: 2 })),
  ]
    .sort((a, b) => a.nivel - b.nivel)
    .slice(0, 20);

  const filtrosAtivos: { label: string; clear: () => void }[] = [];
  const removeDoSet = (set: Set<string>, valor: string, setter: (s: Set<string>) => void) => () => {
    const next = new Set(set);
    next.delete(valor);
    setter(next);
  };
  vendedorIds.forEach((id) => filtrosAtivos.push({ label: `Vendedor: ${vendedores.find((v) => v.id === id)?.nome ?? id}`, clear: removeDoSet(vendedorIds, id, setVendedorIds) }));
  localIds.forEach((id) => filtrosAtivos.push({ label: `Local: ${locais.find((l) => l.id === id)?.nome ?? id}`, clear: removeDoSet(localIds, id, setLocalIds) }));
  statusSel.forEach((s) => filtrosAtivos.push({ label: `Estágio: ${STAGE_LABELS[s as keyof typeof STAGE_LABELS] ?? s}`, clear: removeDoSet(statusSel, s, setStatusSel) }));
  responsavelIds.forEach((id) => filtrosAtivos.push({ label: `Responsável: ${vendedores.find((v) => v.id === id)?.nome ?? id}`, clear: removeDoSet(responsavelIds, id, setResponsavelIds) }));
  if (cliente) filtrosAtivos.push({ label: `Cliente: ${cliente}`, clear: () => setCliente("") });
  if (modelo) filtrosAtivos.push({ label: `Modelo: ${modelo}`, clear: () => setModelo("") });
  if (faturamentoDe) filtrosAtivos.push({ label: `Faturado de ${faturamentoDe}`, clear: () => setFaturamentoDe("") });
  if (faturamentoAte) filtrosAtivos.push({ label: `Faturado até ${faturamentoAte}`, clear: () => setFaturamentoAte("") });

  const limparTodos = () => {
    setVendedorIds(new Set()); setLocalIds(new Set()); setStatusSel(new Set()); setResponsavelIds(new Set());
    setCliente(""); setModelo(""); setFaturamentoDe(""); setFaturamentoAte("");
  };

  const totalRef = Math.max(1, filtrados.length);
  const pct = (n: number) => `${Math.round((n / totalRef) * 100)}% da seleção`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-ink">O que precisa de atenção na operação hoje?</h1>
        <p className="text-sm text-muted" data-numeric>
          {filtrados.length} de {veiculos.length} veículos na seleção · {emAndamento.length} em andamento · {count("09_entregue") + count("10_encerrado")} entregues/encerrados
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-wrap items-end gap-2">
          <FilterField label="Vendedor">
            <MultiSelect
              className="w-40"
              placeholder="Todos"
              options={vendedores.map((v) => ({ value: v.id, label: v.nome }))}
              selected={vendedorIds}
              onChange={setVendedorIds}
            />
          </FilterField>
          <FilterField label="Local">
            <MultiSelect
              className="w-40"
              placeholder="Todos"
              options={locais.map((l) => ({ value: l.id, label: l.nome }))}
              selected={localIds}
              onChange={setLocalIds}
            />
          </FilterField>
          <FilterField label="Estágio">
            <MultiSelect
              className="w-44"
              placeholder="Todos"
              options={PIPELINE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
              selected={statusSel}
              onChange={setStatusSel}
            />
          </FilterField>
          <FilterField label="Responsável">
            <MultiSelect
              className="w-40"
              placeholder="Todos"
              options={vendedores.map((v) => ({ value: v.id, label: v.nome }))}
              selected={responsavelIds}
              onChange={setResponsavelIds}
            />
          </FilterField>
          <FilterField label="Cliente">
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Buscar..." className="w-36" />
          </FilterField>
          <FilterField label="Modelo">
            <Input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Buscar..." className="w-28" />
          </FilterField>
          <FilterField label="Faturado de">
            <Input type="date" value={faturamentoDe} onChange={(e) => setFaturamentoDe(e.target.value)} className="w-36" />
          </FilterField>
          <FilterField label="Faturado até">
            <Input type="date" value={faturamentoAte} onChange={(e) => setFaturamentoAte(e.target.value)} className="w-36" />
          </FilterField>
        </div>

        {filtrosAtivos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Filtros ativos:</span>
            {filtrosAtivos.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={f.clear}
                className="inline-flex items-center gap-1 rounded-full bg-belcar-100 px-2.5 py-0.5 text-xs font-medium text-belcar-900 transition-colors hover:bg-belcar-100/70"
                title="Remover filtro"
              >
                {f.label}
                <X size={11} />
              </button>
            ))}
            <button
              type="button"
              onClick={limparTodos}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-ink"
            >
              <FilterX size={11} /> Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* Camada 1 — o que exige ação agora */}
      <section aria-label="Alertas da operação">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-danger">Exige ação agora</p>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <AlertTile label="Bloqueio crítico" value={bloqueioCritico} icon={AlertTriangle} sub="avaria, NF cancelada ou tarefa bloqueada" to="/veiculos?bloqueio=1" />
          <AlertTile label="SLA vencido" value={slaAlerta.length} icon={Clock} sub="mais de 5 dias parado no estágio" to="/veiculos?sla=vencido" />
          <AlertTile label="Sem responsável" value={semResponsavel} icon={UserX} sub="veículo ou tarefa aberta sem dono" to="/veiculos?sem_responsavel=1" />
          <AlertTile label="Recall pendente" value={comRecall} icon={ShieldAlert} sub="recall aberto ou em serviço" to="/veiculos?recall=1" />
        </div>
      </section>

      {/* Camada 2 — fluxo do pipeline */}
      <section aria-label="Fluxo do pipeline">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Fluxo do pipeline</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiTile label="Aguardando faturamento" value={count("01_aguardando_faturamento")} sub={pct(count("01_aguardando_faturamento"))} icon={FileText} tone="info" to="/veiculos?status=01_aguardando_faturamento" />
          <KpiTile label="Faturados" value={count("02_faturado")} sub={pct(count("02_faturado"))} icon={FileText} tone="info" to="/veiculos?status=02_faturado" />
          <KpiTile label="Em pátio" value={count("03_em_patio")} sub={pct(count("03_em_patio"))} icon={MapPin} tone="info" to="/veiculos?status=03_em_patio" />
          <KpiTile label="Em preparação" value={count("05_em_preparacao")} sub={pct(count("05_em_preparacao"))} icon={Wrench} tone="info" to="/veiculos?status=05_em_preparacao" />
          <KpiTile label="Aguardando agenda" value={aguardandoAgenda} sub="liberados sem data marcada" icon={Calendar} tone="warning" to="/veiculos?status=07_liberado" />
          <KpiTile label="Agendados" value={count("08_agendado_cliente")} sub={pct(count("08_agendado_cliente"))} icon={Calendar} tone="info" to="/agenda" />
        </div>
      </section>

      {/* Camada 2b — pendências paralelas */}
      <section aria-label="Pendências paralelas">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Pendências paralelas</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiTile label="Pendência de pagamento" value={pendenciaPagamento} sub={pct(pendenciaPagamento)} icon={DollarSign} tone="warning" to="/veiculos?nao_pago=1" />
          <KpiTile label="Pendência de acessórios" value={pendenciaAcessorios} sub="tarefas de acessório abertas" icon={PackageCheck} tone="warning" to="/tarefas" />
          <KpiTile label="Em movimentação" value={emMovimentacao} sub="transferências não finalizadas" icon={Truck} tone="info" to="/movimentacao" />
          <KpiTile label="Entregues" value={count("09_entregue")} sub={pct(count("09_entregue"))} icon={PackageCheck} tone="success" to="/entregues" />
        </div>
      </section>

      {/* Camada 3 — distribuição */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Onde os veículos estão parados no pipeline?</CardTitle>
            <CardDescription data-numeric>
              Estágios ativos (Entregue/Encerrado ficam fora da régua: {count("09_entregue")} entregues, {count("10_encerrado")} encerrados)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {porEstagio.map((p) => (
              <Link
                key={p.stage}
                to={`/veiculos?status=${p.stage}`}
                className="group flex items-center gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-background"
              >
                <span className="w-56 shrink-0 text-xs text-muted group-hover:text-ink">{STAGE_LABELS[p.stage]}</span>
                <div className="h-3 flex-1 rounded-full bg-background">
                  <div
                    className="h-3 rounded-full bg-belcar-600 transition-[width] duration-300"
                    style={{ width: `${(p.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium text-ink" data-numeric>{p.count}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Veículos por fase</CardTitle>
            <CardDescription>3 macro-fases do pipeline</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {totalPorFase.map((f) => (
              <div key={f.fase} className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-sm font-medium text-ink">{FASE_LABELS[f.fase]}</span>
                <span className="text-xl font-bold text-belcar-900" data-numeric>{f.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Camada 4 — tendência e performance */}
      <section aria-label="Tendência e performance">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Tendência e performance</p>
        <div className="flex flex-col gap-4">
          <EntregasHeatmap agenda={agendaFiltrada} vendedores={vendedores} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <CustoMensalChart veiculos={filtrados} />
            <DiasPorEtapaChart veiculos={filtrados} />
          </div>
          <LocaisChart veiculos={filtrados} locais={locais} />
        </div>
      </section>

      {/* Camada 5 — detalhe auditável */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas críticos (top 20)</CardTitle>
          <CardDescription>NF cancelada e avaria primeiro; clique para abrir o veículo</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {alertasCriticos.length === 0 && <p className="text-sm text-muted">Nenhum alerta crítico na seleção atual. 👌</p>}
          {alertasCriticos.map((a, i) => (
            <Link key={i} to={`/veiculos/${a.chassi}`} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-background">
              <AlertTriangle size={13} className={a.nivel <= 1 ? "text-danger" : "text-warning"} />
              <span className="text-ink">{a.texto}</span>
              <span className="ml-auto font-mono text-xs text-muted">{a.chassi}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const TONE_CLASSES: Record<string, { bar: string; icon: string }> = {
  navy: { bar: "bg-belcar-900", icon: "bg-belcar-100 text-belcar-900" },
  info: { bar: "bg-belcar-600", icon: "bg-belcar-100 text-belcar-700" },
  success: { bar: "bg-success", icon: "bg-success-bg text-success" },
  warning: { bar: "bg-warning", icon: "bg-warning-bg text-warning" },
  danger: { bar: "bg-danger", icon: "bg-danger-bg text-danger" },
};

function KpiTile({
  label, value, sub, icon: Icon, tone, to,
}: {
  label: string; value: number; sub?: string; icon: typeof Truck; tone: keyof typeof TONE_CLASSES; to: string;
}) {
  const palette = TONE_CLASSES[tone];
  return (
    <Link
      to={to}
      className="relative block overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belcar-500"
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${palette.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ink" data-numeric>{value}</p>
          {sub && <p className="mt-0.5 truncate text-[11px] text-muted" title={sub}>{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${palette.icon}`}>
          <Icon size={16} />
        </div>
      </div>
    </Link>
  );
}

// Tile de alerta — mais forte visualmente que os KPIs comuns (Lei 5: alerta > KPI).
// Some a cor quando o valor é zero, pra não gritar sem motivo.
function AlertTile({
  label, value, sub, icon: Icon, to,
}: {
  label: string; value: number; sub: string; icon: typeof Truck; to: string;
}) {
  const ok = value === 0;
  return (
    <Link
      to={to}
      className={`relative block overflow-hidden rounded-lg border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belcar-500 ${
        ok ? "border-border bg-surface" : "border-danger/40 bg-danger-bg/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${ok ? "text-muted" : "text-danger"}`}>{label}</p>
          <p className={`mt-2 text-3xl font-bold ${ok ? "text-ink" : "text-danger"}`} data-numeric>{value}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted" title={sub}>{sub}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
          <Icon size={16} />
        </div>
      </div>
    </Link>
  );
}

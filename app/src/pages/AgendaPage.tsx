import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAgendaEntregas, useVeiculos, useVendedores } from "@/data/hooks";
import { createAgendaEntrega } from "@/data/store";
import type { AgendaEntrega, Veiculo } from "@/types/domain";
import { STAGE_LABELS } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";

// ---- helpers de data (yyyy-mm-dd local) ----

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return isoLocal(d);
}

const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function weekdayLabel(iso: string): string {
  return WEEKDAY[new Date(iso + "T00:00:00").getDay()];
}

// Entregador é texto livre na planilha: MARCIO ≠ MÁRCIO ≠ "BRUNO/MARCIO" ≠
// "MARCIO / BRUNO". Normaliza acento, caixa e ordem das duplas pra não
// duplicar a mesma pessoa como linha do mapa.
function normEntregador(raw: string | null): string {
  if (!raw?.trim()) return "SEM ENTREGADOR";
  const flat = raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  return flat.split("/").map((p) => p.trim()).filter(Boolean).sort().join(" / ");
}

export function AgendaPage() {
  const agenda = useAgendaEntregas();
  const veiculos = useVeiculos();
  const vendedores = useVendedores();

  const hoje = isoLocal(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [agendarOpen, setAgendarOpen] = useState(false);

  const futuras = useMemo(
    () => agenda.filter((a) => a.data >= hoje).sort((a, b) => a.data.localeCompare(b.data) || (a.horaNormalizada ?? "99").localeCompare(b.horaNormalizada ?? "99")),
    [agenda, hoje]
  );
  const passadas = useMemo(
    () => agenda.filter((a) => a.data < hoje).sort((a, b) => b.data.localeCompare(a.data)),
    [agenda, hoje]
  );

  const chassisComAgendaFutura = useMemo(() => new Set(futuras.map((a) => a.chassi)), [futuras]);
  const prontosParaAgendar = veiculos.filter((v) => v.statusAtual === "07_liberado" && !chassisComAgendaFutura.has(v.chassi));
  const emPreparacao = veiculos.filter((v) => ["04_verificacao_documentacao", "05_em_preparacao", "06_qualidade"].includes(v.statusAtual)).length;

  const entregasHoje = futuras.filter((a) => a.data === hoje).length;
  const proximos7 = futuras.filter((a) => a.data <= addDays(hoje, 6)).length;
  const naoCompareceu = agenda.filter((a) => a.statusAgendamento === "NÃO COMPARECEU").length;

  // ---- mapa entregador × data (janela de 7 dias) ----
  const windowStart = addDays(hoje, weekOffset * 7);
  const windowDays = Array.from({ length: 7 }, (_, i) => addDays(windowStart, i));
  const windowSet = new Set(windowDays);
  const entriesInWindow = agenda.filter((a) => windowSet.has(a.data));

  const entregadores = useMemo(() => {
    const keys = [...new Set(entriesInWindow.map((a) => normEntregador(a.entregador)))];
    return keys.sort((a, b) => (a === "SEM ENTREGADOR" ? 1 : b === "SEM ENTREGADOR" ? -1 : a.localeCompare(b, "pt-BR")));
  }, [entriesInWindow]);

  const cell = (entregador: string, dia: string) =>
    entriesInWindow.filter((a) => a.data === dia && normEntregador(a.entregador) === entregador);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Agenda de Entrega Técnica</h1>
          <p className="text-sm text-muted" data-numeric>
            {futuras.length} entregas futuras · {prontosParaAgendar.length} veículos prontos aguardando agenda
          </p>
        </div>
        <Button onClick={() => setAgendarOpen(true)}>
          <CalendarPlus size={14} /> Agendar entrega
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MiniKpi label="Entregas hoje" value={entregasHoje} tone={entregasHoje > 0 ? "info" : "neutral"} />
        <MiniKpi label="Próximos 7 dias" value={proximos7} tone="info" />
        <MiniKpi label="Prontos p/ agendar" value={prontosParaAgendar.length} tone={prontosParaAgendar.length > 0 ? "warning" : "neutral"} sub="liberados sem data marcada" />
        <MiniKpi label="Não compareceu (histórico)" value={naoCompareceu} tone="danger" />
      </div>

      {/* Mapa visual: entregador × data */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Mapa de entregas — entregador × data</CardTitle>
            <CardDescription>
              {formatDate(windowDays[0])} a {formatDate(windowDays[6])}
              {weekOffset === 0 && " (semana atual)"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semana anterior">
              <ChevronLeft size={14} />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Hoje</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Próxima semana">
              <ChevronRight size={14} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {entregadores.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nenhuma entrega nesta semana.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40 border-b border-border px-2 py-2 text-left text-xs font-semibold uppercase text-muted">Entregador</th>
                  {windowDays.map((dia) => (
                    <th
                      key={dia}
                      className={cn(
                        "border-b border-border px-2 py-2 text-center text-xs font-semibold uppercase",
                        dia === hoje ? "rounded-t-md bg-belcar-100 text-belcar-900" : "text-muted"
                      )}
                    >
                      {weekdayLabel(dia)}<br />
                      <span className="font-normal" data-numeric>{dia.slice(8, 10)}/{dia.slice(5, 7)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entregadores.map((ent) => (
                  <tr key={ent}>
                    <td className="border-b border-border px-2 py-2 align-top text-xs font-medium text-ink">{ent}</td>
                    {windowDays.map((dia) => {
                      const items = cell(ent, dia);
                      return (
                        <td
                          key={dia}
                          className={cn(
                            "min-w-24 border-b border-border px-1 py-1.5 align-top",
                            dia === hoje && "bg-belcar-100/40"
                          )}
                        >
                          <div className="flex flex-col gap-1">
                            {items.map((a) => (
                              <MapChip key={a.id} agenda={a} veiculo={veiculos.find((v) => v.chassi === a.chassi)} />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Agenda futura */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-belcar-900">Agenda futura</h2>
        {futuras.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            Nenhuma entrega futura agendada. {prontosParaAgendar.length > 0 && `${prontosParaAgendar.length} veículos liberados aguardam agendamento.`}
          </p>
        )}
        {Object.entries(
          futuras.reduce<Record<string, AgendaEntrega[]>>((acc, a) => {
            (acc[a.data] ??= []).push(a);
            return acc;
          }, {})
        ).map(([data, itens]) => (
          <div key={data} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink" data-numeric>
              {formatDate(data)} · {weekdayLabel(data)}
              {data === hoje && <span className="ml-2 rounded-full bg-belcar-100 px-2 py-0.5 text-xs font-medium text-belcar-900">hoje</span>}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {itens.map((a) => {
                const veiculo = veiculos.find((v) => v.chassi === a.chassi);
                const vendedor = vendedores.find((v) => v.id === a.vendedorId)?.nome;
                return (
                  <Card key={a.id}>
                    <CardHeader>
                      <CardTitle>
                        <Link to={`/veiculos/${a.chassi}`} className="hover:underline">
                          {veiculo?.veiculo ?? a.chassi}
                        </Link>
                      </CardTitle>
                      <CardDescription className="font-mono">{a.chassi}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1 text-sm text-muted">
                      <span className="flex items-center gap-1"><Clock size={12} /> {a.horaRaw ?? "Sem horário definido"}</span>
                      <span className="flex items-center gap-1"><User size={12} /> {vendedor ?? "—"} · {a.entregador ?? "sem entregador"}</span>
                      {a.modalidade && <span>{a.modalidade}</span>}
                      <span>{a.lavado ? "Lavado ✓" : "Lavagem pendente"} · {a.acessorios ? "Acessórios ✓" : "Sem acessórios"}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Histórico compacto */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de entregas</CardTitle>
          <CardDescription data-numeric>{passadas.length} entregas passadas — 30 mais recentes abaixo</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="px-2 py-1.5">Data</th>
                <th className="px-2 py-1.5">Veículo</th>
                <th className="px-2 py-1.5">Entregador</th>
                <th className="px-2 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {passadas.slice(0, 30).map((a) => {
                const veiculo = veiculos.find((v) => v.chassi === a.chassi);
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="whitespace-nowrap px-2 py-1.5 text-muted" data-numeric>{formatDate(a.data)}</td>
                    <td className="px-2 py-1.5">
                      <Link to={`/veiculos/${a.chassi}`} className="text-belcar-700 hover:underline">
                        {veiculo?.veiculo ?? a.chassi}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-muted">{a.entregador ?? "—"}</td>
                    <td className="px-2 py-1.5">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        a.statusAgendamento === "CONCLUIDO" && "bg-success-bg text-success",
                        a.statusAgendamento === "NÃO COMPARECEU" && "bg-danger-bg text-danger",
                        !a.statusAgendamento && "bg-fase1-bg text-fase1"
                      )}>
                        {a.statusAgendamento ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AgendarEntregaDialog
        open={agendarOpen}
        onOpenChange={setAgendarOpen}
        prontos={prontosParaAgendar}
        emPreparacao={emPreparacao}
        entregadoresConhecidos={[...new Set(agenda.map((a) => normEntregador(a.entregador)))].filter((e) => e !== "SEM ENTREGADOR").sort()}
      />
    </div>
  );
}

function MiniKpi({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone: "info" | "warning" | "danger" | "neutral" }) {
  const toneClass = {
    info: "text-belcar-700",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-ink",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", toneClass)} data-numeric>{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function MapChip({ agenda, veiculo }: { agenda: AgendaEntrega; veiculo: Veiculo | undefined }) {
  const concluida = agenda.statusAgendamento === "CONCLUIDO";
  const faltou = agenda.statusAgendamento === "NÃO COMPARECEU";
  return (
    <Link
      to={`/veiculos/${agenda.chassi}`}
      title={`${veiculo?.veiculo ?? agenda.chassi} · ${agenda.horaRaw ?? "sem hora"} · ${agenda.chassi}${agenda.statusAgendamento ? ` · ${agenda.statusAgendamento}` : ""}`}
      className={cn(
        "block truncate rounded px-1.5 py-1 text-[11px] font-medium leading-tight transition-colors",
        faltou ? "bg-danger-bg text-danger hover:bg-danger-bg/70"
          : concluida ? "bg-success-bg text-success hover:bg-success-bg/70"
          : "bg-belcar-100 text-belcar-900 hover:bg-belcar-100/70"
      )}
    >
      {agenda.horaNormalizada ?? agenda.horaRaw ?? "—"} · {veiculo?.veiculo ?? agenda.chassi}
    </Link>
  );
}

// Dialog de agendamento — lista APENAS veículos com preparação concluída (R9).
function AgendarEntregaDialog({
  open, onOpenChange, prontos, emPreparacao, entregadoresConhecidos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prontos: Veiculo[];
  emPreparacao: number;
  entregadoresConhecidos: string[];
}) {
  const vendedores = useVendedores();
  const hoje = isoLocal(new Date());

  const [chassi, setChassi] = useState("");
  const [data, setData] = useState(hoje);
  const [hora, setHora] = useState("");
  const [entregador, setEntregador] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selecionado = prontos.find((v) => v.chassi === chassi);

  async function handleConfirm() {
    setSubmitting(true);
    setErrors([]);
    const result = await createAgendaEntrega({
      chassi,
      data,
      horaRaw: hora || null,
      entregador: entregador || null,
      modalidade: modalidade || null,
      vendedorId: vendedorId || null,
    });
    setSubmitting(false);
    if (!result.ok) {
      setErrors(result.violations.map((v) => `${v.rule}: ${v.message}`));
      return;
    }
    setChassi(""); setHora(""); setEntregador(""); setModalidade(""); setVendedorId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar entrega técnica</DialogTitle>
          <DialogDescription>
            R9: só entram aqui veículos com a preparação concluída (07 Liberado).
            {emPreparacao > 0 && ` ${emPreparacao} veículos ainda em preparação não aparecem nesta lista.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ag-veiculo">Veículo liberado ({prontos.length} disponíveis)</Label>
            <Select value={chassi} onValueChange={setChassi}>
              <SelectTrigger id="ag-veiculo">
                <SelectValue placeholder={prontos.length === 0 ? "Nenhum veículo liberado aguardando agenda" : "Selecione o veículo"} />
              </SelectTrigger>
              <SelectContent>
                {prontos.map((v) => (
                  <SelectItem key={v.chassi} value={v.chassi}>
                    {v.veiculo} · {v.chassi}{v.cliente ? ` · ${v.cliente}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selecionado && (
              <p className="text-xs text-muted">
                Estágio atual: {STAGE_LABELS[selecionado.statusAtual]} — ao confirmar, avança para 08 Agendado Cliente.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="ag-data">Data (hoje ou futura — R9)</Label>
              <Input id="ag-data" type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ag-hora">Hora</Label>
              <Input id="ag-hora" value={hora} onChange={(e) => setHora(e.target.value)} placeholder="09:00 ou De manhã" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="ag-entregador">Entregador</Label>
              <Input id="ag-entregador" list="entregadores-conhecidos" value={entregador} onChange={(e) => setEntregador(e.target.value)} placeholder="Nome do entregador" />
              <datalist id="entregadores-conhecidos">
                {entregadoresConhecidos.map((e) => <option key={e} value={e} />)}
              </datalist>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ag-vendedor">Vendedor</Label>
              <Select value={vendedorId} onValueChange={setVendedorId}>
                <SelectTrigger id="ag-vendedor"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="ag-modalidade">Modalidade</Label>
            <Input id="ag-modalidade" value={modalidade} onChange={(e) => setModalidade(e.target.value)} placeholder="Ex.: entrega no pátio, cliente retira..." />
          </div>

          {errors.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-danger-bg bg-danger-bg p-3 text-sm text-danger">
              {errors.map((e) => (
                <div key={e} className="flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {e}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={submitting || !chassi || !data}>
            Confirmar agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

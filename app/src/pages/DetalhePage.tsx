import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useVeiculo, useHistorico, useVendedores, useLocais, useImplementos,
  useAgendaEntregas, useMotivosReprovacao, usePosVendaEventos, useTarefas,
  useTarefaAnexosPorChassi, useTarefaHistoricoPorChassi,
} from "@/data/hooks";
import { StatusBadge } from "@/components/StatusBadge";
import { FlagBadges } from "@/components/FlagBadges";
import { AdvanceStageDialog } from "@/components/AdvanceStageDialog";
import { MovimentacaoVeiculo } from "@/components/MovimentacaoVeiculo";
import { TarefaCard } from "@/components/TarefaCard";
import { TarefaDrawer } from "@/components/TarefaDrawer";
import { CreateTarefaModal } from "@/components/CreateTarefaModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  STAGE_LABELS, nextStage, TIPO_VENDA_LABELS, RECALL_LABELS, POS_VENDA_LABELS,
  isCategoriaBloqueante,
} from "@/types/domain";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, ArrowRight, XCircle, Plus, FileText, FileImage, Mic } from "lucide-react";

export function DetalhePage() {
  const { chassi } = useParams<{ chassi: string }>();
  const veiculo = useVeiculo(chassi);
  const historico = useHistorico(chassi);
  const vendedores = useVendedores();
  const locais = useLocais();
  const implementos = useImplementos();
  const agendaEntregas = useAgendaEntregas();
  const motivos = useMotivosReprovacao();
  const posVenda = usePosVendaEventos(chassi);
  const tarefasDoVeiculo = useTarefas(chassi);

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [createTarefaOpen, setCreateTarefaOpen] = useState(false);
  const [openTarefaId, setOpenTarefaId] = useState<string | null>(null);

  if (!veiculo) {
    return (
      <div className="flex flex-col gap-2">
        <Link to="/veiculos" className="text-sm text-belcar-700 hover:underline">← Voltar</Link>
        <p className="text-muted">Veículo não encontrado.</p>
      </div>
    );
  }

  const target = nextStage(veiculo.statusAtual);
  const isQualidade = veiculo.statusAtual === "06_qualidade";
  const vendedorNome = vendedores.find((v) => v.id === veiculo.vendedorId)?.nome;
  const responsavelNome = vendedores.find((v) => v.id === veiculo.responsavelId)?.nome;
  const localNome = locais.find((l) => l.id === veiculo.localAtualId)?.nome;
  const implementoNome = implementos.find((i) => i.id === veiculo.implementoId)?.nome;
  const agendaDoVeiculo = agendaEntregas.filter((a) => a.chassi === veiculo.chassi);

  const tarefasBloqueantesAbertas = tarefasDoVeiculo.filter(
    (t) => t.status !== "concluida" && isCategoriaBloqueante(t.categoria)
  );
  const tarefasAbertas = tarefasDoVeiculo.filter((t) => t.status !== "concluida").length;

  return (
    <div className="flex flex-col gap-4">
      <Link to="/veiculos" className="flex items-center gap-1 text-sm text-belcar-700 hover:underline w-fit">
        <ArrowLeft size={14} /> Voltar para lista
      </Link>

      <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background px-6 pb-3 pt-1">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-ink">{veiculo.veiculo}</h1>
            <p className="font-mono text-sm text-muted">{veiculo.chassi}</p>
          </div>
          <div className="flex gap-2">
            {isQualidade && (
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                <XCircle size={14} /> Reprovar
              </Button>
            )}
            {target && (
              <Button onClick={() => setAdvanceOpen(true)}>
                <ArrowRight size={14} /> Avançar para {STAGE_LABELS[target]}
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={veiculo.statusAtual} />
          <FlagBadges veiculo={veiculo} />
          {tarefasAbertas > 0 && (
            <span className="inline-flex items-center rounded-full bg-belcar-100 px-2 py-0.5 text-xs font-medium text-belcar-900">
              {tarefasAbertas} tarefa(s) aberta(s)
            </span>
          )}
        </div>
        {isQualidade && tarefasBloqueantesAbertas.length > 0 && (
          <p className="mt-2 text-xs text-danger">
            Não pode liberar (R6): {tarefasBloqueantesAbertas.map((t) => t.titulo).join(", ")}
          </p>
        )}
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas ({tarefasDoVeiculo.length})</TabsTrigger>
          <TabsTrigger value="movimentacao">Movimentação</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VisaoGeralTab
            veiculo={veiculo}
            implementoNome={implementoNome}
            vendedorNome={vendedorNome}
            responsavelNome={responsavelNome}
            localNome={localNome}
            posVenda={posVenda}
          />
        </TabsContent>

        <TabsContent value="tarefas">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">Tarefas deste veículo — categorias em vermelho bloqueiam a liberação (R6).</p>
              <Button size="sm" onClick={() => setCreateTarefaOpen(true)}>
                <Plus size={14} /> Nova tarefa
              </Button>
            </div>
            {tarefasDoVeiculo.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
                Nenhuma tarefa registrada para este veículo.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {tarefasDoVeiculo.map((t) => (
                  <TarefaCard key={t.id} tarefa={t} onOpen={setOpenTarefaId} showChassi={false} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="movimentacao">
          <MovimentacaoVeiculo veiculo={veiculo} />
        </TabsContent>

        <TabsContent value="agenda">
          <div className="flex flex-col gap-2">
            {agendaDoVeiculo.length === 0 && <p className="text-sm text-muted">Sem agenda registrada.</p>}
            {agendaDoVeiculo.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between pt-4 text-sm">
                  <div>
                    <p className="font-medium text-ink">Entrega: {formatDate(a.data)} · {a.horaRaw ?? "—"}</p>
                    <p className="text-xs text-muted">{a.modalidade} · {a.entregador}</p>
                  </div>
                  <div className="text-xs text-muted">
                    {a.lavado ? "Lavado ✓" : "Lavagem pendente"} · {a.acessorios ? "Acessórios ✓" : "Sem acessórios"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <HistoricoTab chassi={veiculo.chassi} historico={historico} motivos={motivos} vendedores={vendedores} tarefasDoVeiculo={tarefasDoVeiculo} />
        </TabsContent>

        <TabsContent value="anexos">
          <AnexosTab chassi={veiculo.chassi} tarefasDoVeiculo={tarefasDoVeiculo} />
        </TabsContent>
      </Tabs>

      <AdvanceStageDialog veiculo={veiculo} open={advanceOpen} onOpenChange={setAdvanceOpen} />
      {isQualidade && (
        <AdvanceStageDialog veiculo={veiculo} open={rejectOpen} onOpenChange={setRejectOpen} forcedTarget="05_em_preparacao" />
      )}
      <CreateTarefaModal open={createTarefaOpen} onOpenChange={setCreateTarefaOpen} chassiFixo={veiculo.chassi} />
      {openTarefaId && <TarefaDrawer tarefaId={openTarefaId} onClose={() => setOpenTarefaId(null)} />}
    </div>
  );
}

function VisaoGeralTab({
  veiculo, implementoNome, vendedorNome, responsavelNome, localNome, posVenda,
}: {
  veiculo: ReturnType<typeof useVeiculo>;
  implementoNome: string | undefined;
  vendedorNome: string | undefined;
  responsavelNome: string | undefined;
  localNome: string | undefined;
  posVenda: ReturnType<typeof usePosVendaEventos>;
}) {
  if (!veiculo) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Dados do veículo</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Cor" value={veiculo.cor} />
            <Row label="Cliente" value={veiculo.cliente} />
            <Row label="Implemento" value={implementoNome} />
            <Row label="Vendedor" value={vendedorNome} />
            <Row label="Responsável atual (R2)" value={responsavelNome} />
            <Row label="Local atual" value={localNome} />
            <Row label="Classificação comercial" value={TIPO_VENDA_LABELS[veiculo.tipoVenda]} />
            <Row label="Valor" value={formatCurrency(veiculo.valor)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Faturamento e pagamento</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="NF" value={veiculo.nf} />
            <Row label="Data de faturamento" value={formatDate(veiculo.dataFaturamento)} />
            <Row label="Pago" value={veiculo.pago ? "Sim" : "Não"} />
            <Row label="Recall/Campanha" value={RECALL_LABELS[veiculo.recallStatus]} />
            <Row label="NF cancelada" value={veiculo.nfCancelada ? "Sim" : "Não"} />
          </CardContent>
        </Card>
      </div>

      {posVenda.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pós-venda (fora do pipeline técnico, ocorre depois do Encerrado)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {posVenda.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="font-medium">{POS_VENDA_LABELS[p.tipo]}</span>
                <span className="text-xs text-muted">{p.status ?? "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HistoricoTab({
  chassi, historico, motivos, vendedores, tarefasDoVeiculo,
}: {
  chassi: string;
  historico: ReturnType<typeof useHistorico>;
  motivos: ReturnType<typeof useMotivosReprovacao>;
  vendedores: ReturnType<typeof useVendedores>;
  tarefasDoVeiculo: ReturnType<typeof useTarefas>;
}) {
  const todosTarefaHistoricos = useTarefaHistoricoPorChassi(chassi);
  const tituloPorTarefaId = useMemo(
    () => new Map(tarefasDoVeiculo.map((t) => [t.id, t.titulo])),
    [tarefasDoVeiculo]
  );

  const eventos = useMemo(() => {
    const statusEventos = historico.map((h) => ({
      tipo: "status" as const,
      createdAt: h.createdAt,
      titulo: `${h.statusAnterior ? `${STAGE_LABELS[h.statusAnterior]} → ` : ""}${STAGE_LABELS[h.statusNovo]}`,
      detalhe: motivos.find((m) => m.id === h.motivoReprovacaoId)?.descricao ?? h.motivoTexto,
      autor: vendedores.find((v) => v.id === h.responsavelId)?.nome,
    }));
    const tarefaEventos = todosTarefaHistoricos.map((h) => {
      const tarefaTitulo = tituloPorTarefaId.get(h.tarefaId) ?? "tarefa removida";
      return {
        tipo: "tarefa" as const,
        createdAt: h.createdAt,
        titulo: h.campo === "criacao" ? `Tarefa criada: ${tarefaTitulo}` : `${tarefaTitulo} — ${h.campo}: ${h.valorAnterior ?? "—"} → ${h.valorNovo ?? "—"}`,
        detalhe: null as string | null,
        autor: vendedores.find((v) => v.id === h.autorId)?.nome,
      };
    });
    return [...statusEventos, ...tarefaEventos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [historico, motivos, vendedores, todosTarefaHistoricos, tituloPorTarefaId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline consolidada (status + tarefas — R4/R8, append-only)</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
          {eventos.map((e, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${e.tipo === "status" ? "bg-belcar-600" : "bg-fase2"}`} />
              <p className="text-sm font-medium text-ink">{e.titulo}</p>
              <p className="text-xs text-muted">{formatDateTime(e.createdAt)} {e.autor ? `· ${e.autor}` : ""}</p>
              {e.detalhe && <p className="mt-1 text-xs text-danger">Motivo: {e.detalhe}</p>}
            </li>
          ))}
          {eventos.length === 0 && <p className="text-sm text-muted">Sem eventos registrados.</p>}
        </ol>
      </CardContent>
    </Card>
  );
}

function AnexosTab({ chassi, tarefasDoVeiculo }: { chassi: string; tarefasDoVeiculo: ReturnType<typeof useTarefas> }) {
  const anexosBrutos = useTarefaAnexosPorChassi(chassi);
  const tituloPorTarefaId = useMemo(
    () => new Map(tarefasDoVeiculo.map((t) => [t.id, t.titulo])),
    [tarefasDoVeiculo]
  );
  const anexos = anexosBrutos.map((a) => ({ ...a, tarefaTitulo: tituloPorTarefaId.get(a.tarefaId) ?? "tarefa removida" }));

  if (anexos.length === 0) {
    return <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">Nenhum anexo em nenhuma tarefa deste veículo.</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {anexos.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex items-start gap-3 pt-4 text-sm">
            {a.tipo === "imagem" ? <FileImage size={16} className="text-belcar-700" /> : a.tipo === "audio" ? <Mic size={16} className="text-belcar-700" /> : <FileText size={16} className="text-belcar-700" />}
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{a.nome}</p>
              <p className="text-xs text-muted">{a.tarefaTitulo}</p>
              <p className="text-xs text-muted">{formatDate(a.enviadoEm)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink text-right">{value || "—"}</span>
    </div>
  );
}

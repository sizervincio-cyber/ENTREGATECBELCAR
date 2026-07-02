import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Veiculo, AgendaEntrega, Vendedor, Local } from "@/types/domain";
import { PIPELINE_STAGES, STAGE_LABELS, type StatusPipeline } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { daysSince, cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

// Visuais do dashboard seguindo as leis de storytelling de dados:
// título é a pergunta de negócio, todo número tem referência (média/SLA/%),
// ranking sempre ordenado, e cada card fecha com um insight automático.

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`;
}

function compactBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)} mil`;
  return `R$ ${Math.round(v)}`;
}

// Meses com ano plausível — a planilha tem typos tipo "2062".
const anoSano = (key: string) => {
  const y = Number(key.slice(0, 4));
  return y >= 2024 && y <= 2030;
};

function Insight({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 border-t border-border pt-2 text-xs text-belcar-900">
      <Lightbulb size={13} className="mt-0.5 shrink-0 text-warning" />
      <span>{children}</span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// 1. Entregas por mês × vendedor (matriz heatmap)
// ---------------------------------------------------------------------------
export function EntregasHeatmap({ agenda, vendedores }: { agenda: AgendaEntrega[]; vendedores: Vendedor[] }) {
  const dados = useMemo(() => {
    const concluidas = agenda.filter((a) => a.statusAgendamento === "CONCLUIDO" && anoSano(a.data));
    const meses = [...new Set(concluidas.map((a) => a.data.slice(0, 7)))].sort().slice(-8);
    const mesesSet = new Set(meses);
    const porVendedor = new Map<string, Map<string, number>>();
    for (const a of concluidas) {
      const mes = a.data.slice(0, 7);
      if (!mesesSet.has(mes)) continue;
      const nome = vendedores.find((v) => v.id === a.vendedorId)?.nome ?? "Sem vendedor";
      if (!porVendedor.has(nome)) porVendedor.set(nome, new Map());
      const linha = porVendedor.get(nome)!;
      linha.set(mes, (linha.get(mes) ?? 0) + 1);
    }
    const linhas = [...porVendedor.entries()]
      .map(([nome, porMes]) => ({ nome, porMes, total: [...porMes.values()].reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total);
    const top = linhas.slice(0, 8);
    const resto = linhas.slice(8);
    if (resto.length > 0) {
      const porMes = new Map<string, number>();
      for (const r of resto) r.porMes.forEach((v, k) => porMes.set(k, (porMes.get(k) ?? 0) + v));
      top.push({ nome: `Outros (${resto.length})`, porMes, total: resto.reduce((s, r) => s + r.total, 0) });
    }
    const totalMes = new Map<string, number>();
    for (const l of linhas) l.porMes.forEach((v, k) => totalMes.set(k, (totalMes.get(k) ?? 0) + v));
    const maxCelula = Math.max(1, ...top.flatMap((l) => [...l.porMes.values()]));
    const melhorMes = [...totalMes.entries()].sort((a, b) => b[1] - a[1])[0];
    return { meses, linhas: top, totalMes, maxCelula, melhorMes, lider: linhas[0], totalGeral: concluidas.length };
  }, [agenda, vendedores]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quantas entregas fizemos por mês — e quem entregou?</CardTitle>
        <CardDescription data-numeric>
          {dados.totalGeral} entregas concluídas na agenda (status CONCLUIDO) — intensidade da célula = volume
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {dados.linhas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhuma entrega concluída na seleção atual.</p>
        ) : (
          <>
            <table className="w-full text-sm" data-numeric>
              <thead>
                <tr className="text-xs uppercase text-muted">
                  <th className="px-2 py-1.5 text-left font-semibold">Vendedor</th>
                  {dados.meses.map((m) => <th key={m} className="px-2 py-1.5 text-center font-semibold">{monthLabel(m)}</th>)}
                  <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((l) => (
                  <tr key={l.nome} className="border-t border-border">
                    <td className="max-w-40 truncate px-2 py-1 text-xs font-medium text-ink" title={l.nome}>{l.nome}</td>
                    {dados.meses.map((m) => {
                      const v = l.porMes.get(m) ?? 0;
                      const alpha = v === 0 ? 0 : 0.08 + 0.72 * (v / dados.maxCelula);
                      return (
                        <td key={m} className="px-1 py-1 text-center">
                          <span
                            className="inline-block w-full rounded px-1 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: v === 0 ? "transparent" : `rgba(37, 99, 172, ${alpha})`,
                              color: alpha > 0.45 ? "#ffffff" : v === 0 ? "#c3c9d1" : "#12141a",
                            }}
                          >
                            {v === 0 ? "·" : v}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-right text-xs font-bold text-belcar-900">{l.total}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border">
                  <td className="px-2 py-1.5 text-xs font-bold uppercase text-muted">Total mês</td>
                  {dados.meses.map((m) => (
                    <td key={m} className="px-2 py-1.5 text-center text-xs font-bold text-ink">{dados.totalMes.get(m) ?? 0}</td>
                  ))}
                  <td className="px-2 py-1.5 text-right text-xs font-bold text-belcar-900">{dados.totalGeral}</td>
                </tr>
              </tbody>
            </table>
            {dados.lider && dados.melhorMes && (
              <Insight>
                <strong>{dados.lider.nome}</strong> lidera com {dados.lider.total} entregas.
                Melhor mês: <strong>{monthLabel(dados.melhorMes[0])}</strong> ({dados.melhorMes[1]} entregas).
              </Insight>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 2. Custo total por mês (coluna VALOR da planilha — preparação/acessórios)
// ---------------------------------------------------------------------------
export function CustoMensalChart({ veiculos }: { veiculos: Veiculo[] }) {
  const dados = useMemo(() => {
    const porMes = new Map<string, { valor: number; qtd: number }>();
    let cobertos = 0;
    for (const v of veiculos) {
      if (!v.valor || !v.dataFaturamento) continue;
      const mes = v.dataFaturamento.slice(0, 7);
      if (!anoSano(mes)) continue;
      cobertos += 1;
      const atual = porMes.get(mes) ?? { valor: 0, qtd: 0 };
      porMes.set(mes, { valor: atual.valor + v.valor, qtd: atual.qtd + 1 });
    }
    const meses = [...porMes.keys()].sort().slice(-12);
    const serie = meses.map((m) => ({ mes: m, ...porMes.get(m)! }));
    const max = Math.max(1, ...serie.map((s) => s.valor));
    const total = serie.reduce((s, x) => s + x.valor, 0);
    const media = serie.length ? total / serie.length : 0;
    const pico = [...serie].sort((a, b) => b.valor - a.valor)[0];
    return { serie, max, media, total, pico, cobertos };
  }, [veiculos]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quanto custou a preparação por mês?</CardTitle>
        <CardDescription data-numeric>
          Coluna VALOR da planilha (acessórios/preparação), somada pelo mês do faturamento — {dados.cobertos} veículos com valor informado
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dados.serie.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhum veículo com valor na seleção atual.</p>
        ) : (
          <>
            <div className="relative">
              {/* linha de referência: média mensal (Lei 2 — número precisa de âncora) */}
              <div
                className="absolute inset-x-0 z-10 border-t border-dashed border-belcar-600"
                style={{ bottom: `${(dados.media / dados.max) * 130 + 34}px` }}
                title={`Média mensal: ${compactBRL(dados.media)}`}
              />
              <div className="flex items-end gap-1.5" style={{ height: 190 }} data-numeric>
                {dados.serie.map((s) => {
                  const ehPico = s.mes === dados.pico.mes;
                  return (
                    <div key={s.mes} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <span className={cn("text-[10px] font-medium", ehPico ? "text-belcar-900" : "text-muted")}>
                        {compactBRL(s.valor)}
                      </span>
                      <div
                        className={cn("w-full rounded-t transition-colors", ehPico ? "bg-belcar-900" : "bg-belcar-500 hover:bg-belcar-600")}
                        style={{ height: `${(s.valor / dados.max) * 130}px` }}
                        title={`${monthLabel(s.mes)}: ${compactBRL(s.valor)} em ${s.qtd} veículos`}
                      />
                      <span className="text-[10px] text-muted">{monthLabel(s.mes)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Insight>
              Total do período: <strong>{compactBRL(dados.total)}</strong> · média <strong>{compactBRL(dados.media)}/mês</strong> (linha tracejada) ·
              pico em <strong>{monthLabel(dados.pico.mes)}</strong> ({compactBRL(dados.pico.valor)}).
            </Insight>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 3. Locais físicos dos veículos em operação
// ---------------------------------------------------------------------------
export function LocaisChart({ veiculos, locais }: { veiculos: Veiculo[]; locais: Local[] }) {
  const navigate = useNavigate();
  const dados = useMemo(() => {
    const ativos = veiculos.filter((v) => v.statusAtual !== "09_entregue" && v.statusAtual !== "10_encerrado");
    const porLocal = new Map<string | null, number>();
    for (const v of ativos) porLocal.set(v.localAtualId, (porLocal.get(v.localAtualId) ?? 0) + 1);
    const linhas = [...porLocal.entries()]
      .map(([id, count]) => ({ id, nome: id ? (locais.find((l) => l.id === id)?.nome ?? "?") : "Sem local informado", count }))
      .sort((a, b) => b.count - a.count);
    const top = linhas.slice(0, 10);
    const outros = linhas.slice(10).reduce((s, l) => s + l.count, 0);
    const max = Math.max(1, ...top.map((l) => l.count));
    return { top, outros, max, totalAtivos: ativos.length, lider: top[0] };
  }, [veiculos, locais]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onde os veículos estão fisicamente agora?</CardTitle>
        <CardDescription data-numeric>{dados.totalAtivos} veículos em operação (entregues ficam fora) — clique para abrir a lista</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5" data-numeric>
        {dados.top.map((l) => {
          const pct = Math.round((l.count / Math.max(1, dados.totalAtivos)) * 100);
          const conteudo = (
            <>
              <span className="w-40 shrink-0 truncate text-xs text-muted group-hover:text-ink" title={l.nome}>{l.nome}</span>
              <div className="h-3.5 flex-1 rounded-full bg-background">
                <div
                  className={cn("h-3.5 rounded-full", l.id ? "bg-belcar-600" : "bg-warning")}
                  style={{ width: `${(l.count / dados.max) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-medium text-ink">{l.count} · {pct}%</span>
            </>
          );
          return l.id ? (
            <button
              key={l.id}
              type="button"
              onClick={() => navigate(`/veiculos?local=${l.id}`)}
              className="group flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-background"
            >
              {conteudo}
            </button>
          ) : (
            <div key="sem-local" className="flex items-center gap-2 px-1 py-0.5" title="Sem local informado na planilha">
              {conteudo}
            </div>
          );
        })}
        {dados.outros > 0 && (
          <p className="px-1 text-[11px] text-muted" data-numeric>+ {dados.outros} veículos em outros locais</p>
        )}
        {dados.lider && (
          <Insight>
            <strong>{dados.lider.nome}</strong> concentra {Math.round((dados.lider.count / Math.max(1, dados.totalAtivos)) * 100)}%
            da frota em operação ({dados.lider.count} veículos).
          </Insight>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 4. Dias médios por etapa (com SLA de 5 dias como referência)
// ---------------------------------------------------------------------------
const SLA_DIAS = 5;

export function DiasPorEtapaChart({ veiculos }: { veiculos: Veiculo[] }) {
  const dados = useMemo(() => {
    const ativos = veiculos.filter((v) => v.statusAtual !== "09_entregue" && v.statusAtual !== "10_encerrado");
    const linhas = PIPELINE_STAGES
      .filter((s) => s !== "09_entregue" && s !== "10_encerrado")
      .map((stage) => {
        const doStage = ativos.filter((v) => v.statusAtual === stage);
        const media = doStage.length ? doStage.reduce((s, v) => s + daysSince(v.updatedAt), 0) / doStage.length : 0;
        return { stage: stage as StatusPipeline, qtd: doStage.length, media };
      })
      .filter((l) => l.qtd > 0);
    const max = Math.max(SLA_DIAS + 2, ...linhas.map((l) => l.media));
    const pior = [...linhas].sort((a, b) => b.media - a.media)[0];
    return { linhas, max, pior };
  }, [veiculos]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quanto tempo os veículos ficam parados em cada etapa?</CardTitle>
        <CardDescription data-numeric>Média de dias no estágio atual · linha tracejada = SLA de {SLA_DIAS} dias</CardDescription>
      </CardHeader>
      <CardContent>
        {dados.linhas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhum veículo em operação na seleção atual.</p>
        ) : (
          <>
            <div className="relative flex flex-col gap-1.5" data-numeric>
              {/* marcador do SLA atravessando todas as barras */}
              <div
                className="absolute bottom-0 top-0 z-10 border-l border-dashed border-danger"
                style={{ left: `calc(10.5rem + (100% - 16rem) * ${SLA_DIAS / dados.max})` }}
                title={`SLA: ${SLA_DIAS} dias`}
              />
              {dados.linhas.map((l) => {
                const estourou = l.media > SLA_DIAS;
                return (
                  <Link
                    key={l.stage}
                    to={`/veiculos?status=${l.stage}`}
                    className="group flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-background"
                  >
                    <span className="w-40 shrink-0 truncate text-xs text-muted group-hover:text-ink">{STAGE_LABELS[l.stage]}</span>
                    <div className="h-3.5 flex-1 rounded-full bg-background">
                      <div
                        className={cn("h-3.5 rounded-full", estourou ? "bg-danger" : "bg-success")}
                        style={{ width: `${(l.media / dados.max) * 100}%` }}
                      />
                    </div>
                    <span className={cn("w-20 shrink-0 text-right text-xs font-medium", estourou ? "text-danger" : "text-ink")}>
                      {l.media.toFixed(0)}d · {l.qtd} veíc.
                    </span>
                  </Link>
                );
              })}
            </div>
            {dados.pior && (
              <Insight>
                Pior gargalo: <strong>{STAGE_LABELS[dados.pior.stage]}</strong> — média de{" "}
                <strong>{dados.pior.media.toFixed(0)} dias</strong> ({(dados.pior.media / SLA_DIAS).toFixed(1)}× o SLA)
                com {dados.pior.qtd} veículos parados.
              </Insight>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

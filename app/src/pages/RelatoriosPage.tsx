import { useMemo } from "react";
import { useTarefas, useVendedores, useVeiculos } from "@/data/hooks";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, daysSince, exportCsv } from "@/lib/utils";
import { Download } from "lucide-react";

export function RelatoriosPage() {
  const tarefas = useTarefas();
  const vendedores = useVendedores();
  const veiculos = useVeiculos();

  const produtividade = useMemo(() => {
    return vendedores
      .map((v) => {
        const doResponsavel = tarefas.filter((t) => t.responsavelId === v.id);
        const concluidas = doResponsavel.filter((t) => t.status === "concluida");
        const abertas = doResponsavel.filter((t) => t.status !== "concluida");
        const temposConclusao = concluidas
          .filter((t) => t.concluidaEm)
          .map((t) => (new Date(t.concluidaEm!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const tempoMedio = temposConclusao.length > 0 ? temposConclusao.reduce((a, b) => a + b, 0) / temposConclusao.length : null;
        return { nome: v.nome, concluidas: concluidas.length, abertas: abertas.length, tempoMedio };
      })
      .filter((r) => r.concluidas + r.abertas > 0)
      .sort((a, b) => b.concluidas - a.concluidas);
  }, [tarefas, vendedores]);

  const custoPorVeiculo = useMemo(() => {
    const porChassi = new Map<string, number>();
    for (const t of tarefas) {
      if (t.valor) porChassi.set(t.chassi, (porChassi.get(t.chassi) ?? 0) + t.valor);
    }
    return [...porChassi.entries()]
      .map(([chassi, custo]) => ({ chassi, custo, veiculo: veiculos.find((v) => v.chassi === chassi) }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 30);
  }, [tarefas, veiculos]);

  const slaPorFase = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => {
      const doEstagio = veiculos.filter((v) => v.statusAtual === stage);
      const media = doEstagio.length > 0 ? doEstagio.reduce((sum, v) => sum + daysSince(v.updatedAt), 0) / doEstagio.length : 0;
      return { stage, quantidade: doEstagio.length, mediaDias: media };
    });
  }, [veiculos]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Relatórios Executivos</h1>
        <p className="text-sm text-muted">3 relatórios fixos com exportação CSV — ver docs/v2-torre-de-controle/04-telas-mvp.md.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Produtividade por responsável</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCsv(
              "produtividade.csv",
              ["Responsável", "Concluídas", "Abertas", "Tempo médio (dias)"],
              produtividade.map((r) => [r.nome, r.concluidas, r.abertas, r.tempoMedio != null ? r.tempoMedio.toFixed(1) : ""])
            )}
          >
            <Download size={13} /> Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="py-1.5">Responsável</th>
                <th className="py-1.5">Concluídas</th>
                <th className="py-1.5">Abertas</th>
                <th className="py-1.5">Tempo médio de conclusão</th>
              </tr>
            </thead>
            <tbody>
              {produtividade.map((r) => (
                <tr key={r.nome} className="border-b border-border last:border-0">
                  <td className="py-1.5 font-medium text-ink">{r.nome}</td>
                  <td className="py-1.5 text-muted">{r.concluidas}</td>
                  <td className="py-1.5 text-muted">{r.abertas}</td>
                  <td className="py-1.5 text-muted">{r.tempoMedio != null ? `${r.tempoMedio.toFixed(1)} dias` : "—"}</td>
                </tr>
              ))}
              {produtividade.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted">Sem dados.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Custo de preparação por veículo (top 30)</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCsv(
              "custo-preparacao.csv",
              ["Chassi", "Veículo", "Cliente", "Custo total"],
              custoPorVeiculo.map((r) => [r.chassi, r.veiculo?.veiculo ?? "", r.veiculo?.cliente ?? "", r.custo])
            )}
          >
            <Download size={13} /> Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="py-1.5">Chassi</th>
                <th className="py-1.5">Veículo</th>
                <th className="py-1.5">Cliente</th>
                <th className="py-1.5">Custo total</th>
              </tr>
            </thead>
            <tbody>
              {custoPorVeiculo.map((r) => (
                <tr key={r.chassi} className="border-b border-border last:border-0">
                  <td className="py-1.5 font-mono text-xs text-belcar-700">{r.chassi}</td>
                  <td className="py-1.5 text-ink">{r.veiculo?.veiculo ?? "—"}</td>
                  <td className="py-1.5 text-muted">{r.veiculo?.cliente ?? "—"}</td>
                  <td className="py-1.5 font-medium text-ink">{formatCurrency(r.custo)}</td>
                </tr>
              ))}
              {custoPorVeiculo.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted">Sem dados.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>SLA por fase (tempo médio no estágio atual)</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCsv(
              "sla-por-fase.csv",
              ["Estágio", "Quantidade", "Média de dias"],
              slaPorFase.map((r) => [STAGE_LABELS[r.stage], r.quantidade, r.mediaDias.toFixed(1)])
            )}
          >
            <Download size={13} /> Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {slaPorFase.map((r) => (
            <div key={r.stage} className="flex items-center justify-between text-sm">
              <span className="text-ink">{STAGE_LABELS[r.stage]}</span>
              <span className="text-muted">{r.quantidade} veículos · média {r.mediaDias.toFixed(1)} dias</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

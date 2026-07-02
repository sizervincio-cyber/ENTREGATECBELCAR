import { Link } from "react-router-dom";
import { useMovimentacoes, useVeiculos, useLocais } from "@/data/hooks";
import { PRIORIDADE_LABELS, PRIORIDADE_ORDER } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const PRIORIDADE_VARIANT: Record<string, "danger" | "warning" | "neutral" | "success" | "default"> = {
  "1_hoje": "danger",
  "2_amanha": "warning",
  "3_agendado": "default",
  "4_na_fila": "neutral",
  "5_remessa_ans": "neutral",
  "7_onde_esta": "warning",
  "8_aguard_pagamento": "warning",
  "6_finalizado": "success",
};

export function MovimentacaoPage() {
  const movimentacoes = useMovimentacoes();
  const veiculos = useVeiculos();
  const locais = useLocais();

  const ordenadas = [...movimentacoes].sort(
    (a, b) => PRIORIDADE_ORDER.indexOf(a.prioridade) - PRIORIDADE_ORDER.indexOf(b.prioridade)
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Fila de Movimentação</h1>
        <p className="text-sm text-muted">Eixo próprio, separado do status principal — ligado por chassi.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Prioridade</th>
              <th className="px-3 py-2">Chassi</th>
              <th className="px-3 py-2">Veículo</th>
              <th className="px-3 py-2">Origem</th>
              <th className="px-3 py-2">Destino</th>
              <th className="px-3 py-2">Motorista</th>
              <th className="px-3 py-2">Solicitado em</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((m) => {
              const veiculo = veiculos.find((v) => v.chassi === m.chassi);
              return (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-3 py-2"><Badge variant={PRIORIDADE_VARIANT[m.prioridade]}>{PRIORIDADE_LABELS[m.prioridade]}</Badge></td>
                  <td className="px-3 py-2">
                    <Link to={`/veiculos/${m.chassi}`} className="font-mono text-xs text-belcar-700 hover:underline">{m.chassi}</Link>
                  </td>
                  <td className="px-3 py-2">{veiculo?.veiculo ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{locais.find((l) => l.id === m.origemLocalId)?.nome ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{locais.find((l) => l.id === m.destinoLocalId)?.nome ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{m.motorista ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{formatDate(m.dataSolicitacao)}</td>
                </tr>
              );
            })}
            {ordenadas.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Nenhuma movimentação registrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

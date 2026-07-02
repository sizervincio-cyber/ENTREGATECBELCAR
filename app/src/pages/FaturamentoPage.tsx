import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVeiculos, useVendedores } from "@/data/hooks";
import { updateVeiculo } from "@/data/store";
import { TIPO_VENDA_LABELS, type TipoVenda } from "@/types/domain";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

type Situacao = "sem_nf" | "nf_sem_pagamento" | "pago" | "nf_cancelada" | "venda_direta";

const ALL = "__all__";

function situacaoDoVeiculo(v: ReturnType<typeof useVeiculos>[number]): Situacao {
  if (v.nfCancelada) return "nf_cancelada";
  if (v.tipoVenda === "venda_direta") return "venda_direta";
  if (!v.nf) return "sem_nf";
  if (!v.pago) return "nf_sem_pagamento";
  return "pago";
}

const SITUACAO_LABELS: Record<Situacao, string> = {
  sem_nf: "Sem NF",
  nf_sem_pagamento: "NF emitida, aguardando pagamento",
  pago: "Pago",
  nf_cancelada: "NF cancelada",
  venda_direta: "Venda direta",
};

const SITUACAO_TONE: Record<Situacao, "danger" | "warning" | "success" | "neutral" | "default"> = {
  sem_nf: "warning",
  nf_sem_pagamento: "warning",
  pago: "success",
  nf_cancelada: "danger",
  venda_direta: "default",
};

export function FaturamentoPage() {
  const veiculos = useVeiculos();
  const vendedores = useVendedores();
  const [situacao, setSituacao] = useState(ALL);
  const [vendedorId, setVendedorId] = useState(ALL);
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    return veiculos.filter((v) => {
      if (situacao !== ALL && situacaoDoVeiculo(v) !== situacao) return false;
      if (vendedorId !== ALL && v.vendedorId !== vendedorId) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!v.chassi.toLowerCase().includes(q) && !(v.cliente ?? "").toLowerCase().includes(q) && !(v.nf ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [veiculos, situacao, vendedorId, busca]);

  const totalNaoPago = filtrados.filter((v) => !v.pago).reduce((s, v) => s + (v.valor ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Faturamento</h1>
        <p className="text-sm text-muted">{filtrados.length} veículos · valor pendente de pagamento: {formatCurrency(totalNaoPago)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por chassi, cliente ou NF..."
          className="w-64"
        />
        <Select value={situacao} onValueChange={setSituacao}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Situação de faturamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as situações</SelectItem>
            {(Object.keys(SITUACAO_LABELS) as Situacao[]).map((s) => (
              <SelectItem key={s} value={s}>{SITUACAO_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={vendedorId} onValueChange={setVendedorId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Vendedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os vendedores</SelectItem>
            {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Chassi</th>
              <th className="px-3 py-2">Veículo</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">NF</th>
              <th className="px-3 py-2">Data Fat.</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((v) => {
              const s = situacaoDoVeiculo(v);
              return (
                <tr key={v.chassi} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-3 py-2">
                    <Link to={`/veiculos/${v.chassi}`} className="font-mono text-xs text-belcar-700 hover:underline">{v.chassi}</Link>
                  </td>
                  <td className="px-3 py-2">{v.veiculo}</td>
                  <td className="px-3 py-2 text-muted">{v.cliente ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{TIPO_VENDA_LABELS[v.tipoVenda as TipoVenda]}</td>
                  <td className="px-3 py-2 text-muted">{v.nf ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{formatDate(v.dataFaturamento)}</td>
                  <td className="px-3 py-2 text-muted">{formatCurrency(v.valor)}</td>
                  <td className="px-3 py-2"><Badge variant={SITUACAO_TONE[s]}>{SITUACAO_LABELS[s]}</Badge></td>
                  <td className="px-3 py-2">
                    {!v.pago && v.nf && (
                      <Button size="sm" variant="outline" onClick={() => updateVeiculo({ chassi: v.chassi, patch: { pago: true } })}>
                        Marcar pago
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted">Nenhum veículo encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

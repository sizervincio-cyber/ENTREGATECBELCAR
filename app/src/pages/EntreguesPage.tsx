import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVeiculos, useVendedores } from "@/data/hooks";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";

const ALL = "__all__";

export function EntreguesPage() {
  const veiculos = useVeiculos();
  const vendedores = useVendedores();
  const [busca, setBusca] = useState("");
  const [vendedorId, setVendedorId] = useState(ALL);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const entregues = useMemo(
    () => veiculos.filter((v) => v.statusAtual === "09_entregue" || v.statusAtual === "10_encerrado"),
    [veiculos]
  );

  const filtrados = useMemo(() => {
    return entregues.filter((v) => {
      if (vendedorId !== ALL && v.vendedorId !== vendedorId) return false;
      if (de && (!v.dataFaturamento || v.dataFaturamento < de)) return false;
      if (ate && (!v.dataFaturamento || v.dataFaturamento > ate)) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!v.chassi.toLowerCase().includes(q) && !(v.cliente ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [entregues, vendedorId, de, ate, busca]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Histórico de Entregues</h1>
        <p className="text-sm text-muted">{filtrados.length} de {entregues.length} veículos entregues/encerrados</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por chassi ou cliente..." className="w-64" />
        <Select value={vendedorId} onValueChange={setVendedorId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Vendedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os vendedores</SelectItem>
            {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-40" />
        <span className="text-sm text-muted">até</span>
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-40" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Chassi</th>
              <th className="px-3 py-2">Veículo</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Vendedor</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((v) => (
              <tr key={v.chassi} className="border-b border-border last:border-0 hover:bg-background">
                <td className="px-3 py-2">
                  <Link to={`/veiculos/${v.chassi}`} className="font-mono text-xs text-belcar-700 hover:underline">{v.chassi}</Link>
                </td>
                <td className="px-3 py-2">{v.veiculo}</td>
                <td className="px-3 py-2 text-muted">{v.cliente ?? "—"}</td>
                <td className="px-3 py-2 text-muted">{vendedores.find((ve) => ve.id === v.vendedorId)?.nome ?? "—"}</td>
                <td className="px-3 py-2 text-muted">{formatDate(v.dataFaturamento)}</td>
                <td className="px-3 py-2 text-muted">{formatCurrency(v.valor)}</td>
                <td className="px-3 py-2"><StatusBadge status={v.statusAtual} /></td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Nenhum veículo encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

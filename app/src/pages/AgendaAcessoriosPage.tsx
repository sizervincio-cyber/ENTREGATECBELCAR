import { Link } from "react-router-dom";
import { useAgendaAcessorios, useVeiculos, useLocais, useVendedores } from "@/data/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export function AgendaAcessoriosPage() {
  const agenda = useAgendaAcessorios();
  const veiculos = useVeiculos();
  const locais = useLocais();
  const vendedores = useVendedores();

  const ordenada = [...agenda].sort((a, b) => (a.dataAgenda ?? "").localeCompare(b.dataAgenda ?? ""));
  const custoTotal = agenda.reduce((s, a) => s + (a.valor ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Agenda de Acessórios</h1>
        <p className="text-sm text-muted">{agenda.length} instalações · valor total {formatCurrency(custoTotal)}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Chassi</th>
              <th className="px-3 py-2">Veículo</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Local</th>
              <th className="px-3 py-2">Vendedor</th>
              <th className="px-3 py-2">Data/Hora</th>
              <th className="px-3 py-2">Produtivo</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">OS</th>
              <th className="px-3 py-2">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {ordenada.map((a) => {
              const veiculo = veiculos.find((v) => v.chassi === a.chassi);
              return (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-3 py-2">
                    <Link to={`/veiculos/${a.chassi}`} className="font-mono text-xs text-belcar-700 hover:underline">{a.chassi}</Link>
                  </td>
                  <td className="px-3 py-2">{veiculo?.veiculo ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{veiculo?.cliente ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{locais.find((l) => l.id === a.localId)?.nome ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{vendedores.find((v) => v.id === a.vendedorId)?.nome ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{formatDate(a.dataAgenda)} {a.horaAgenda ?? ""}</td>
                  <td className="px-3 py-2 text-muted">{a.produtivo ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{formatCurrency(a.valor)}</td>
                  <td className="px-3 py-2 text-muted">{a.os ?? "—"}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-muted" title={a.descricaoAcessorios ?? ""}>{a.descricaoAcessorios ?? "—"}</td>
                </tr>
              );
            })}
            {ordenada.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted">Nenhuma instalação agendada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader><CardTitle>Sobre este módulo</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted">
          Esta agenda alimenta a Preparação Técnica: cada linha aqui gera automaticamente uma
          tarefa de categoria "Acessório" no módulo de Tarefas, com o valor já copiado.
        </CardContent>
      </Card>
    </div>
  );
}

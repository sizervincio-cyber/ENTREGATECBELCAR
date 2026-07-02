import type { Veiculo } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { TIPO_VENDA_LABELS } from "@/types/domain";

// Flags de bloqueio/exceção paralela — nunca aparecem como status, sempre como
// selos ao lado (ver docs/de-para-status.md).
export function FlagBadges({ veiculo }: { veiculo: Veiculo }) {
  const flags: { label: string; variant: "danger" | "warning" | "neutral" | "outline" }[] = [];

  if (veiculo.nfCancelada) flags.push({ label: "NF Cancelada", variant: "danger" });
  if (veiculo.avariado) flags.push({ label: "Avariado", variant: "danger" });
  if (veiculo.pendenciaBateria) flags.push({ label: "Bateria", variant: "warning" });
  if (veiculo.pendenciaOficina === "falhas") flags.push({ label: "Oficina: Falhas", variant: "warning" });
  if (veiculo.pendenciaOficina === "parametrizacao") flags.push({ label: "Oficina: Parametrização", variant: "warning" });
  if (!veiculo.pago) flags.push({ label: "Não Pago", variant: "warning" });
  if (veiculo.recallStatus === "tem") flags.push({ label: "Recall Pendente", variant: "danger" });
  if (veiculo.recallStatus === "em_servico") flags.push({ label: "Recall em Serviço", variant: "warning" });
  if (veiculo.tipoVenda !== "padrao") flags.push({ label: TIPO_VENDA_LABELS[veiculo.tipoVenda], variant: "outline" });
  if (veiculo.localEntregaEspecial) flags.push({ label: veiculo.localEntregaEspecial, variant: "neutral" });

  if (flags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <Badge key={f.label} variant={f.variant}>
          {f.label}
        </Badge>
      ))}
    </div>
  );
}

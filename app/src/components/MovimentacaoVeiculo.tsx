import { useState } from "react";
import type { Veiculo, ModalidadeTransporte } from "@/types/domain";
import { PRIORIDADE_LABELS, MODALIDADE_TRANSPORTE_LABELS } from "@/types/domain";
import { useLocais, useMovimentacoes } from "@/data/hooks";
import { createMovimentacao, finalizarMovimentacao } from "@/data/store";
import { validateMovimentacao } from "@/lib/rules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, Plus, Truck } from "lucide-react";

// Movimentação vive dentro do chassi: histórico completo (origem → destino,
// km, rodando/cegonha, motorista) + criação de nova movimentação. R10: pode
// movimentar faturado ou não faturado — nunca entregue/encerrado.
export function MovimentacaoVeiculo({ veiculo }: { veiculo: Veiculo }) {
  const locais = useLocais();
  const movimentacoes = useMovimentacoes();
  const [novaOpen, setNovaOpen] = useState(false);

  const doVeiculo = movimentacoes
    .filter((m) => m.chassi === veiculo.chassi)
    .sort((a, b) => (b.dataSolicitacao ?? "").localeCompare(a.dataSolicitacao ?? ""));

  const bloqueios = validateMovimentacao(veiculo);
  const podeMovimentar = bloqueios.length === 0;
  const emAndamento = doVeiculo.filter((m) => m.prioridade !== "6_finalizado");

  const nomeLocal = (id: string | null) => locais.find((l) => l.id === id)?.nome ?? "—";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted" data-numeric>
          {doVeiculo.length} movimentações registradas · {emAndamento.length} em andamento
        </p>
        {podeMovimentar ? (
          <Button size="sm" onClick={() => setNovaOpen(true)}>
            <Plus size={14} /> Nova movimentação
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted" title={bloqueios[0]?.message}>
            <AlertTriangle size={13} className="text-warning" />
            Veículo entregue — sem movimentação (R10)
          </span>
        )}
      </div>

      {doVeiculo.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
          Sem movimentação registrada para este veículo.
        </div>
      )}

      {doVeiculo.map((m) => {
        const finalizada = m.prioridade === "6_finalizado";
        return (
          <Card key={m.id}>
            <CardContent className="flex flex-col gap-2 pt-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium text-ink">
                  <span>{nomeLocal(m.origemLocalId)}</span>
                  <ArrowRight size={13} className="text-muted" />
                  <span>{nomeLocal(m.destinoLocalId)}</span>
                </div>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  finalizada ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
                )}>
                  {PRIORIDADE_LABELS[m.prioridade]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span data-numeric>Solicitado {formatDate(m.dataSolicitacao)}</span>
                {m.dataChegada && <span data-numeric>Chegou {formatDate(m.dataChegada)}</span>}
                {m.motorista && <span>Motorista: {m.motorista}</span>}
                {m.modalidadeTransporte && (
                  <span className="flex items-center gap-1">
                    <Truck size={12} /> {MODALIDADE_TRANSPORTE_LABELS[m.modalidadeTransporte]}
                  </span>
                )}
                {m.km != null && (
                  <span className="flex items-center gap-1" data-numeric>
                    <Gauge size={12} /> {m.km.toLocaleString("pt-BR")} km
                  </span>
                )}
              </div>
              {m.observacoes && <p className="text-xs text-muted">{m.observacoes}</p>}
              {!finalizada && (
                <FinalizarInline movimentacaoId={m.id} kmAtual={m.km ?? null} destino={nomeLocal(m.destinoLocalId)} />
              )}
            </CardContent>
          </Card>
        );
      })}

      <NovaMovimentacaoDialog veiculo={veiculo} open={novaOpen} onOpenChange={setNovaOpen} />
    </div>
  );
}

// Finalizar direto no card: registra km de chegada e move o local do veículo.
function FinalizarInline({ movimentacaoId, kmAtual, destino }: { movimentacaoId: string; kmAtual: number | null; destino: string }) {
  const [km, setKm] = useState(kmAtual != null ? String(kmAtual) : "");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
      <Label htmlFor={`km-${movimentacaoId}`} className="whitespace-nowrap">Km na chegada</Label>
      <Input
        id={`km-${movimentacaoId}`}
        type="number"
        min={0}
        value={km}
        onChange={(e) => setKm(e.target.value)}
        placeholder="km"
        className="h-7 w-28 text-xs"
      />
      <Button
        size="sm"
        variant="success"
        className="h-7"
        disabled={submitting}
        onClick={async () => {
          setSubmitting(true);
          await finalizarMovimentacao(movimentacaoId, km === "" ? null : Number(km));
          setSubmitting(false);
        }}
        title={`Marca a chegada e atualiza o local do veículo para ${destino}`}
      >
        <CheckCircle2 size={12} /> Marcar chegada
      </Button>
    </div>
  );
}

function NovaMovimentacaoDialog({
  veiculo, open, onOpenChange,
}: {
  veiculo: Veiculo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const locais = useLocais();
  const [destinoId, setDestinoId] = useState("");
  const [modalidade, setModalidade] = useState<ModalidadeTransporte | "">("");
  const [km, setKm] = useState("");
  const [motorista, setMotorista] = useState("");
  const [obs, setObs] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const origem = locais.find((l) => l.id === veiculo.localAtualId)?.nome ?? "—";

  async function handleConfirm() {
    setSubmitting(true);
    setErrors([]);
    const result = await createMovimentacao({
      chassi: veiculo.chassi,
      destinoLocalId: destinoId || null,
      motorista: motorista || null,
      km: km === "" ? null : Number(km),
      modalidadeTransporte: modalidade || null,
      observacoes: obs || null,
    });
    setSubmitting(false);
    if (!result.ok) {
      setErrors(result.violations.map((v) => `${v.rule}: ${v.message}`));
      return;
    }
    setDestinoId(""); setModalidade(""); setKm(""); setMotorista(""); setObs("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>
            {veiculo.chassi} · {veiculo.veiculo} — origem: {origem}. R10: movimenta faturado ou não
            faturado; só não movimenta veículo entregue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="mov-destino">Destino</Label>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger id="mov-destino"><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
                <SelectContent>
                  {locais.filter((l) => l.id !== veiculo.localAtualId).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="mov-modalidade">Como vai</Label>
              <Select value={modalidade} onValueChange={(v) => setModalidade(v as ModalidadeTransporte)}>
                <SelectTrigger id="mov-modalidade"><SelectValue placeholder="Rodando ou cegonha" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rodando">Rodando (na própria roda)</SelectItem>
                  <SelectItem value="cegonha">Cegonha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="mov-km">Km atual do veículo (controle)</Label>
              <Input id="mov-km" type="number" min={0} value={km} onChange={(e) => setKm(e.target.value)} placeholder="Ex.: 120" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="mov-motorista">Motorista</Label>
              <Input id="mov-motorista" value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Nome do motorista" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="mov-obs">Observações</Label>
            <Textarea id="mov-obs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Detalhes da movimentação..." />
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
          <Button onClick={handleConfirm} disabled={submitting || !destinoId}>
            Confirmar movimentação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Veiculo, StatusPipeline } from "@/types/domain";
import { STAGE_LABELS, nextStage } from "@/types/domain";
import { useVendedores, useMotivosReprovacao } from "@/data/hooks";
import { advanceStatus, updateVeiculo } from "@/data/store";
import { AlertTriangle } from "lucide-react";

// Etapas 04 e 06 não são colunas do funil visível — são checklist dentro da
// transição. O avanço passa por elas em dois registros (R4 grava as duas
// linhas de histórico), então o dado continua auditável estágio a estágio.
const CHECKLIST_FLOW: Partial<Record<StatusPipeline, { via: StatusPipeline; final: StatusPipeline; pergunta: string }>> = {
  "03_em_patio": {
    via: "04_verificacao_documentacao",
    final: "05_em_preparacao",
    pergunta: "Documentação do veículo verificada (etapa 04 — CRLV, nota, vistoria de chegada)",
  },
  "05_em_preparacao": {
    via: "06_qualidade",
    final: "07_liberado",
    pergunta: "Qualidade inspecionada e aprovada (etapa 06 — preparação conferida, sem pendência bloqueante)",
  },
};

interface Props {
  veiculo: Veiculo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Se definido, força o alvo (usado no botão "Reprovar" da coluna Qualidade).
  forcedTarget?: StatusPipeline;
}

export function AdvanceStageDialog({ veiculo, open, onOpenChange, forcedTarget }: Props) {
  const vendedores = useVendedores();
  const motivos = useMotivosReprovacao();

  const checklist = forcedTarget ? undefined : CHECKLIST_FLOW[veiculo.statusAtual];
  const target = forcedTarget ?? (checklist ? checklist.final : nextStage(veiculo.statusAtual));
  const isReprovacao = veiculo.statusAtual === "06_qualidade" && target === "05_em_preparacao";
  const needsFaturamentoGate = veiculo.statusAtual === "01_aguardando_faturamento";

  const [responsavelId, setResponsavelId] = useState(veiculo.responsavelId ?? "");
  const [nf, setNf] = useState(veiculo.nf ?? "");
  const [dataFaturamento, setDataFaturamento] = useState(veiculo.dataFaturamento ?? "");
  const [motivoId, setMotivoId] = useState("");
  const [motivoTexto, setMotivoTexto] = useState("");
  const [checklistOk, setChecklistOk] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setResponsavelId(veiculo.responsavelId ?? "");
      setNf(veiculo.nf ?? "");
      setDataFaturamento(veiculo.dataFaturamento ?? "");
      setMotivoId("");
      setMotivoTexto("");
      setChecklistOk(false);
      setErrors([]);
    }
  }, [open, veiculo]);

  if (!target) return null;

  async function handleConfirm() {
    setSubmitting(true);
    setErrors([]);

    // R1: persistimos NF/data de faturamento antes de tentar avançar, para que
    // o gate seja avaliado com o dado mais recente digitado no formulário.
    if (needsFaturamentoGate && (nf || dataFaturamento)) {
      await updateVeiculo({ chassi: veiculo.chassi, patch: { nf: nf || null, dataFaturamento: dataFaturamento || null } });
    }

    const base = {
      chassi: veiculo.chassi,
      responsavelId: responsavelId || null,
      motivoReprovacaoId: motivoId || null,
      motivoTexto: motivoTexto || null,
    };

    if (checklist) {
      // Passo 1: registra a passagem pela etapa de checklist (04 ou 06).
      const viaResult = await advanceStatus({ ...base, targetStatus: checklist.via });
      if (!viaResult.ok) {
        setSubmitting(false);
        setErrors(viaResult.violations.map((v) => `${v.rule}: ${v.message}`));
        return;
      }
      // Passo 2: segue pro estágio final. Se um gate barrar aqui (ex.: R6 com
      // tarefa bloqueante), o veículo fica retido na etapa de checklist — que
      // é exatamente o estado real da operação.
      const finalResult = await advanceStatus({ ...base, targetStatus: checklist.final });
      setSubmitting(false);
      if (!finalResult.ok) {
        setErrors([
          `Veículo ficou retido em ${STAGE_LABELS[checklist.via]}:`,
          ...finalResult.violations.map((v) => `${v.rule}: ${v.message}`),
        ]);
        return;
      }
      onOpenChange(false);
      return;
    }

    const result = await advanceStatus({ ...base, targetStatus: target! });

    setSubmitting(false);
    if (!result.ok) {
      setErrors(result.violations.map((v) => `${v.rule}: ${v.message}`));
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isReprovacao ? "Reprovar na Qualidade" : "Avançar estágio"}
          </DialogTitle>
          <DialogDescription>
            {veiculo.chassi} · {veiculo.veiculo} — {STAGE_LABELS[veiculo.statusAtual]} → {STAGE_LABELS[target]}
            {checklist && ` (registra a passagem por ${STAGE_LABELS[checklist.via]})`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {checklist && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-background p-3 text-sm text-ink transition-colors hover:border-belcar-500">
              <input
                type="checkbox"
                checked={checklistOk}
                onChange={(e) => setChecklistOk(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#1e4a80]"
              />
              <span>{checklist.pergunta}</span>
            </label>
          )}
          {needsFaturamentoGate && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="nf">NF (obrigatório — R1)</Label>
                <Input id="nf" value={nf} onChange={(e) => setNf(e.target.value)} placeholder="NF-00000" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="data-fat">Data de faturamento (obrigatório — R1)</Label>
                <Input id="data-fat" type="date" value={dataFaturamento} onChange={(e) => setDataFaturamento(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <Label htmlFor="responsavel">Responsável atribuído (obrigatório — R2)</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger id="responsavel">
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isReprovacao && (
            <div className="flex flex-col gap-3 rounded-md border border-warning-bg bg-warning-bg/40 p-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="motivo">Motivo da reprovação (obrigatório — R3)</Label>
                <Select value={motivoId} onValueChange={setMotivoId}>
                  <SelectTrigger id="motivo">
                    <SelectValue placeholder="Selecione um motivo catalogado" />
                  </SelectTrigger>
                  <SelectContent>
                    {motivos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="motivo-texto">Ou descreva o motivo</Label>
                <Textarea
                  id="motivo-texto"
                  value={motivoTexto}
                  onChange={(e) => setMotivoTexto(e.target.value)}
                  placeholder="Detalhe o motivo da reprovação..."
                />
              </div>
            </div>
          )}

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
          <Button
            variant={isReprovacao ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={submitting || (!!checklist && !checklistOk)}
            title={checklist && !checklistOk ? "Marque o checklist para confirmar" : undefined}
          >
            {isReprovacao ? "Confirmar reprovação" : "Confirmar avanço"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

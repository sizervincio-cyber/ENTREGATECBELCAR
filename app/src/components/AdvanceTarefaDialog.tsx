import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Tarefa, TarefaStatus } from "@/types/domain";
import { TAREFA_STATUS_LABELS, TAREFA_STATUS_ORDER } from "@/types/domain";
import { useVendedores } from "@/data/hooks";
import { updateTarefaStatus } from "@/data/store";
import { AlertTriangle } from "lucide-react";

interface Props {
  tarefa: Tarefa;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdvanceTarefaDialog({ tarefa, open, onOpenChange }: Props) {
  const vendedores = useVendedores();
  const [targetStatus, setTargetStatus] = useState<TarefaStatus>(tarefa.status);
  const [responsavelId, setResponsavelId] = useState(tarefa.responsavelId ?? "");
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTargetStatus(tarefa.status);
      setResponsavelId(tarefa.responsavelId ?? "");
      setMotivoBloqueio(tarefa.motivoBloqueio ?? "");
      setErrors([]);
    }
  }, [open, tarefa]);

  async function handleConfirm() {
    setSubmitting(true);
    setErrors([]);
    const result = await updateTarefaStatus({
      tarefaId: tarefa.id,
      targetStatus,
      responsavelId: responsavelId || null,
      motivoBloqueio: motivoBloqueio || null,
    });
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
          <DialogTitle>Mover tarefa</DialogTitle>
          <DialogDescription>{tarefa.titulo} · {tarefa.chassi}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="target-status">Novo status</Label>
            <Select value={targetStatus} onValueChange={(v) => setTargetStatus(v as TarefaStatus)}>
              <SelectTrigger id="target-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAREFA_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{TAREFA_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetStatus === "em_andamento" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="responsavel">Responsável (obrigatório — R5)</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger id="responsavel">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {targetStatus === "bloqueada" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="motivo-bloqueio">Motivo do bloqueio (obrigatório — R7)</Label>
              <Textarea
                id="motivo-bloqueio"
                value={motivoBloqueio}
                onChange={(e) => setMotivoBloqueio(e.target.value)}
                placeholder="Descreva por que esta tarefa está bloqueada..."
              />
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
          <Button onClick={handleConfirm} disabled={submitting}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

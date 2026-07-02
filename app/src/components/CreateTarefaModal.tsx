import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { TarefaCategoria, TarefaPrioridade } from "@/types/domain";
import { TAREFA_CATEGORIA_LABELS, TAREFA_PRIORIDADE_LABELS } from "@/types/domain";
import { useVeiculos, useVendedores } from "@/data/hooks";
import { createTarefa } from "@/data/store";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chassiFixo?: string;
}

const CATEGORIAS = Object.keys(TAREFA_CATEGORIA_LABELS) as TarefaCategoria[];
const PRIORIDADES = Object.keys(TAREFA_PRIORIDADE_LABELS) as TarefaPrioridade[];

export function CreateTarefaModal({ open, onOpenChange, chassiFixo }: Props) {
  const veiculos = useVeiculos();
  const vendedores = useVendedores();

  const [chassi, setChassi] = useState(chassiFixo ?? "");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<TarefaCategoria>("outro");
  const [responsavelId, setResponsavelId] = useState("");
  const [prioridade, setPrioridade] = useState<TarefaPrioridade>("media");
  const [prazo, setPrazo] = useState("");
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setChassi(chassiFixo ?? "");
      setTitulo("");
      setDescricao("");
      setCategoria("outro");
      setResponsavelId("");
      setPrioridade("media");
      setPrazo("");
      setValor("");
      setError(null);
    }
  }, [open, chassiFixo]);

  async function handleSubmit() {
    setError(null);
    const veiculo = veiculos.find((v) => v.chassi === chassi.trim().toUpperCase());
    if (!veiculo) {
      setError("Chassi não encontrado. Selecione um veículo válido da lista.");
      return;
    }
    if (!titulo.trim()) {
      setError("Título é obrigatório.");
      return;
    }
    setSubmitting(true);
    await createTarefa({
      chassi: veiculo.chassi,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      categoria,
      responsavelId: responsavelId || null,
      prioridade,
      prazo: prazo || null,
      valor: valor ? Number(valor) : null,
      fasePipeline: veiculo.statusAtual,
    });
    setSubmitting(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Toda tarefa pertence a um veículo (chassi obrigatório).</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="chassi">Chassi</Label>
            <Input
              id="chassi"
              list="chassi-options"
              value={chassi}
              onChange={(e) => setChassi(e.target.value)}
              placeholder="Digite ou selecione o chassi"
              disabled={!!chassiFixo}
            />
            <datalist id="chassi-options">
              {veiculos.slice(0, 500).map((v) => (
                <option key={v.chassi} value={v.chassi}>{v.veiculo} — {v.cliente ?? "sem cliente"}</option>
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Instalar defletor cegonheiro" />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes da tarefa..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as TarefaCategoria)}>
                <SelectTrigger id="categoria"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{TAREFA_CATEGORIA_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as TarefaPrioridade)}>
                <SelectTrigger id="prioridade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{TAREFA_PRIORIDADE_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="responsavel">Responsável</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger id="responsavel"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="prazo">Prazo</Label>
              <Input id="prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="valor">Valor / custo (R$)</Label>
            <Input id="valor" type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Opcional" />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-danger-bg bg-danger-bg p-3 text-sm text-danger">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>Criar tarefa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

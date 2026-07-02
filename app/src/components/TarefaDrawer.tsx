import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare, ExternalLink, FileImage, FileText, MessageCircle, Mic, MicOff,
  Paperclip, Trash2, X, ArrowRightCircle,
} from "lucide-react";
import { useTarefa, useTarefaChecklist, useTarefaAnexos, useTarefaComentarios, useTarefaHistorico, useVendedores, useVeiculo } from "@/data/hooks";
import { addChecklistItem, toggleChecklistItem, addAnexo, deleteAnexo, addComentario } from "@/data/store";
import { TarefaCategoriaBadge, TarefaPrioridadeBadge, TarefaStatusBadge } from "@/components/TarefaBadges";
import { AdvanceTarefaDialog } from "@/components/AdvanceTarefaDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import type { TarefaAnexo } from "@/types/domain";

interface Props {
  tarefaId: string | null;
  onClose: () => void;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AnexoCard({ anexo, onDelete }: { anexo: TarefaAnexo; onDelete: (id: string) => void }) {
  const isImage = anexo.tipo === "imagem";
  return (
    <div className="flex items-start gap-3 rounded-lg bg-background p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-belcar-700 shadow-sm">
        {isImage ? <FileImage size={16} /> : anexo.tipo === "audio" ? <Mic size={16} /> : <FileText size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{anexo.nome}</p>
        <p className="mt-1 text-xs text-muted">
          {formatFileSize(anexo.tamanhoBytes)} · {formatDate(anexo.enviadoEm)}
        </p>
        {anexo.tipo === "audio" && anexo.url.startsWith("blob:") && (
          <audio controls src={anexo.url} className="mt-2 h-8 w-full max-w-[240px]" />
        )}
        {anexo.url.startsWith("blob:") && isImage && (
          <img src={anexo.url} alt={anexo.nome} className="mt-2 max-h-32 rounded-md" />
        )}
        {!anexo.url.startsWith("blob:") && (
          <a href={anexo.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-belcar-700 hover:underline">
            Abrir arquivo <ExternalLink size={12} />
          </a>
        )}
      </div>
      <button type="button" onClick={() => onDelete(anexo.id)} className="text-muted hover:text-danger" aria-label="Remover anexo">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function TarefaDrawer({ tarefaId, onClose }: Props) {
  const tarefa = useTarefa(tarefaId ?? undefined);
  const checklist = useTarefaChecklist(tarefaId ?? undefined);
  const anexos = useTarefaAnexos(tarefaId ?? undefined);
  const comentarios = useTarefaComentarios(tarefaId ?? undefined);
  const historico = useTarefaHistorico(tarefaId ?? undefined);
  const vendedores = useVendedores();
  const veiculo = useVeiculo(tarefa?.chassi);

  const [novoItem, setNovoItem] = useState("");
  const [novoComentario, setNovoComentario] = useState("");
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const requestClose = () => {
    if (novoComentario.trim().length > 0 || isRecording) {
      const shouldClose = window.confirm("Existe um comentário não enviado. Deseja fechar mesmo assim?");
      if (!shouldClose) return;
    }
    onClose();
  };

  if (!tarefa || !tarefaId) return null;

  const responsavel = vendedores.find((v) => v.id === tarefa.responsavelId)?.nome;
  const checklistDone = checklist.filter((i) => i.feito).length;

  async function handleAddChecklist() {
    if (!novoItem.trim() || !tarefaId) return;
    await addChecklistItem(tarefaId, novoItem.trim());
    setNovoItem("");
  }

  async function handleAddComentario() {
    if (!novoComentario.trim() || !tarefaId) return;
    await addComentario(tarefaId, novoComentario.trim(), null);
    setNovoComentario("");
  }

  function handleFileUpload(file: File, tipo: "documento" | "imagem" | "audio") {
    if (!tarefaId) return;
    const localUrl = URL.createObjectURL(file);
    addAnexo({
      tarefaId,
      tipo,
      nome: file.name,
      url: localUrl,
      tamanhoBytes: file.size,
      mimeType: file.type,
      enviadoPor: null,
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        handleFileUpload(new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" }), "audio");
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // sem permissão de microfone — ignora silenciosamente no MVP
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="absolute inset-0 bg-black/40" onClick={requestClose} />

      <aside role="dialog" aria-modal="true" className="relative ml-auto flex h-full w-full max-w-[760px] flex-col overflow-hidden bg-surface shadow-2xl">
        <header className="border-b border-border px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <TarefaStatusBadge status={tarefa.status} />
                <TarefaPrioridadeBadge prioridade={tarefa.prioridade} />
                <TarefaCategoriaBadge categoria={tarefa.categoria} />
              </div>
              <h2 className="text-lg font-semibold text-ink">{tarefa.titulo}</h2>
              <Link to={`/veiculos/${tarefa.chassi}`} className="mt-1 inline-block text-sm text-belcar-700 hover:underline">
                {tarefa.chassi} {veiculo ? `· ${veiculo.veiculo}` : ""}
              </Link>
              {tarefa.descricao && <p className="mt-2 text-sm text-muted">{tarefa.descricao}</p>}
            </div>
            <button type="button" onClick={requestClose} className="text-muted hover:text-ink" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-background p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Responsável</p>
              <p className="mt-1 text-sm font-semibold text-ink">{responsavel ?? "Sem responsável"}</p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Prazo</p>
              <p className="mt-1 text-sm font-semibold text-ink">{tarefa.prazo ? formatDate(tarefa.prazo) : "Sem prazo"}</p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Checklist</p>
              <p className="mt-1 text-sm font-semibold text-ink">{checklistDone}/{checklist.length || 0}</p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Valor</p>
              <p className="mt-1 text-sm font-semibold text-ink">{formatCurrency(tarefa.valor)}</p>
            </div>
          </div>

          {tarefa.motivoBloqueio && (
            <div className="mt-3 rounded-lg border border-danger-bg bg-danger-bg p-3 text-sm text-danger">
              Bloqueada: {tarefa.motivoBloqueio}
            </div>
          )}

          <div className="mt-4">
            <Button size="sm" onClick={() => setAdvanceOpen(true)}>
              <ArrowRightCircle size={14} /> Mover tarefa
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                <CheckSquare size={13} /> Checklist
              </p>
              <span className="text-xs text-muted">{checklist.length ? Math.round((checklistDone / checklist.length) * 100) : 0}%</span>
            </div>
            {checklist.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">Nenhum item de checklist.</div>
            ) : (
              <div className="space-y-2">
                {checklist.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-background">
                    <span
                      onClick={() => toggleChecklistItem(item.id, null)}
                      className={cn(
                        "mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border-2",
                        item.feito ? "border-belcar-700 bg-belcar-700 text-white" : "border-border bg-surface"
                      )}
                    >
                      {item.feito && <CheckSquare size={12} />}
                    </span>
                    <span className={cn("text-sm", item.feito ? "text-muted line-through" : "text-ink")}>{item.texto}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <Input
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddChecklist(); }}
                placeholder="Adicionar item ao checklist..."
              />
              <Button size="sm" variant="outline" onClick={handleAddChecklist}>Adicionar</Button>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                <Paperclip size={13} /> Anexos
              </p>
              <div className="flex items-center gap-1">
                <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "documento"); e.target.value = ""; }} />
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "imagem"); e.target.value = ""; }} />
                <Button size="icon" variant="outline" onClick={() => docInputRef.current?.click()} aria-label="Adicionar documento">
                  <FileText size={14} />
                </Button>
                <Button size="icon" variant="outline" onClick={() => imageInputRef.current?.click()} aria-label="Adicionar imagem">
                  <FileImage size={14} />
                </Button>
                <Button size="icon" variant={isRecording ? "destructive" : "outline"} onClick={isRecording ? stopRecording : startRecording} aria-label="Gravar áudio">
                  {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                </Button>
              </div>
            </div>
            {anexos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
                Nenhum anexo. Use os atalhos acima pra adicionar documento, imagem ou áudio.
              </div>
            ) : (
              <div className="space-y-2">
                {anexos.map((a) => <AnexoCard key={a.id} anexo={a} onDelete={deleteAnexo} />)}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              <MessageCircle size={13} /> Comentários
            </div>
            <div className="space-y-3">
              {comentarios.map((c) => (
                <div key={c.id} className="rounded-lg bg-background p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{vendedores.find((v) => v.id === c.autorId)?.nome ?? "Você"}</span>
                    <span className="text-[11px] text-muted">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink">{c.texto}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddComentario(); }}
                placeholder="Escrever comentário..."
              />
              <Button size="sm" onClick={handleAddComentario}>Enviar</Button>
            </div>
          </section>

          <section className="rounded-xl border border-border p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Histórico (R8 — append-only)</p>
            <ol className="mt-3 flex flex-col gap-2 border-l-2 border-border pl-4">
              {historico.map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-belcar-600" />
                  <span className="text-ink">
                    {h.campo === "criacao" ? "Tarefa criada" : `${h.campo}: ${h.valorAnterior ?? "—"} → ${h.valorNovo ?? "—"}`}
                  </span>
                  <span className="ml-2 text-xs text-muted">{formatDateTime(h.createdAt)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </aside>

      <AdvanceTarefaDialog tarefa={tarefa} open={advanceOpen} onOpenChange={setAdvanceOpen} />
    </div>
  );
}

import { useState } from "react";
import { useVendedores, useLocais, useImplementos, useMotivosReprovacao } from "@/data/hooks";
import { renameVendedor, renameLocal, renameImplemento, createMotivoReprovacao } from "@/data/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, Plus } from "lucide-react";

interface Editable {
  id: string;
  nome: string;
  aliases?: string[];
}

function EditableList({ items, onRename }: { items: Editable[]; onRename: (id: string, nome: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center justify-between gap-3 pt-4">
            {editingId === item.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="max-w-xs" />
                <Button
                  size="sm"
                  onClick={() => {
                    onRename(item.id, draft.trim() || item.nome);
                    setEditingId(null);
                  }}
                >
                  <Check size={14} /> Salvar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">{item.nome}</span>
                {item.aliases && item.aliases.length > 0 && (
                  <span className="flex gap-1">
                    {item.aliases.map((a) => <Badge key={a} variant="outline">{a}</Badge>)}
                  </span>
                )}
              </div>
            )}
            {editingId !== item.id && (
              <Button size="sm" variant="outline" onClick={() => { setEditingId(item.id); setDraft(item.nome); }}>
                <Pencil size={12} /> Editar
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
      {items.length === 0 && <p className="text-sm text-muted">Nenhum registro.</p>}
    </div>
  );
}

function MotivosTab() {
  const motivos = useMotivosReprovacao();
  const [novo, setNovo] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="novo-motivo">Novo motivo de reprovação</Label>
          <Input id="novo-motivo" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Ex.: Faltou tapete no acabamento" className="w-80" />
        </div>
        <Button
          onClick={() => {
            if (novo.trim()) {
              createMotivoReprovacao(novo.trim());
              setNovo("");
            }
          }}
        >
          <Plus size={14} /> Adicionar
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {motivos.map((m) => (
          <Card key={m.id}>
            <CardContent className="pt-4 text-sm text-ink">{m.descricao}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function CadastrosPage() {
  const vendedores = useVendedores();
  const locais = useLocais();
  const implementos = useImplementos();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Cadastros de Apoio</h1>
        <p className="text-sm text-muted">Vendedores, locais, implementos e motivos de reprovação — os "aliases" mostram duplicatas já mescladas na importação real.</p>
      </div>

      <Tabs defaultValue="vendedores">
        <TabsList>
          <TabsTrigger value="vendedores">Vendedores ({vendedores.length})</TabsTrigger>
          <TabsTrigger value="locais">Locais ({locais.length})</TabsTrigger>
          <TabsTrigger value="implementos">Implementos ({implementos.length})</TabsTrigger>
          <TabsTrigger value="motivos">Motivos de Reprovação</TabsTrigger>
        </TabsList>
        <TabsContent value="vendedores">
          <EditableList items={vendedores} onRename={renameVendedor} />
        </TabsContent>
        <TabsContent value="locais">
          <EditableList items={locais} onRename={renameLocal} />
        </TabsContent>
        <TabsContent value="implementos">
          <EditableList items={implementos} onRename={renameImplemento} />
        </TabsContent>
        <TabsContent value="motivos">
          <MotivosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

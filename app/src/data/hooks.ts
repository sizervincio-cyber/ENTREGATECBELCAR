import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot } from "@/data/store";

// Leitura reativa e síncrona sobre o snapshot do store (o store já é a fonte
// da verdade em memória; as funções async em store.ts simulam a latência de
// um backend real, mas a UI reage via subscribe/getSnapshot como useSyncExternalStore).
export function useDb() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useVeiculos() {
  return useDb().veiculos;
}

export function useVeiculo(chassi: string | undefined) {
  const db = useDb();
  return chassi ? db.veiculos.find((v) => v.chassi === chassi) : undefined;
}

export function useHistorico(chassi: string | undefined) {
  const db = useDb();
  if (!chassi) return [];
  return db.statusHistorico
    .filter((h) => h.chassi === chassi)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function useVendedores() {
  return useDb().vendedores;
}

export function useLocais() {
  return useDb().locais;
}

export function useImplementos() {
  return useDb().implementos;
}

export function useMotivosReprovacao() {
  return useDb().motivosReprovacao;
}

export function useMovimentacoes() {
  return useDb().movimentacoes;
}

export function useAgendaEntregas() {
  return useDb().agendaEntregas;
}

export function useAgendaAcessorios() {
  return useDb().agendaAcessorios;
}

export function usePosVendaEventos(chassi?: string) {
  const db = useDb();
  return chassi ? db.posVendaEventos.filter((e) => e.chassi === chassi) : db.posVendaEventos;
}

export function useTarefas(chassi?: string) {
  const db = useDb();
  return chassi ? db.tarefas.filter((t) => t.chassi === chassi) : db.tarefas;
}

export function useTarefa(tarefaId: string | undefined) {
  const db = useDb();
  return tarefaId ? db.tarefas.find((t) => t.id === tarefaId) : undefined;
}

export function useTarefaChecklist(tarefaId: string | undefined) {
  const db = useDb();
  if (!tarefaId) return [];
  return db.tarefaChecklistItems
    .filter((i) => i.tarefaId === tarefaId)
    .sort((a, b) => a.ordem - b.ordem);
}

export function useTarefaAnexos(tarefaId: string | undefined) {
  const db = useDb();
  if (!tarefaId) return [];
  return db.tarefaAnexos.filter((a) => a.tarefaId === tarefaId);
}

export function useTarefaComentarios(tarefaId: string | undefined) {
  const db = useDb();
  if (!tarefaId) return [];
  return db.tarefaComentarios
    .filter((c) => c.tarefaId === tarefaId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function useTarefaHistorico(tarefaId: string | undefined) {
  const db = useDb();
  if (!tarefaId) return [];
  return db.tarefaHistorico
    .filter((h) => h.tarefaId === tarefaId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Variantes "por lista de tarefas" — um único useDb(), sem chamar hook dentro de loop/map
// (evita violar Rules of Hooks quando a quantidade de tarefas de um veículo muda).
export function useTarefaHistoricoPorChassi(chassi: string | undefined) {
  const db = useDb();
  if (!chassi) return [];
  const idsDoChassi = new Set(db.tarefas.filter((t) => t.chassi === chassi).map((t) => t.id));
  return db.tarefaHistorico
    .filter((h) => idsDoChassi.has(h.tarefaId))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function useTarefaAnexosPorChassi(chassi: string | undefined) {
  const db = useDb();
  if (!chassi) return [];
  const idsDoChassi = new Set(db.tarefas.filter((t) => t.chassi === chassi).map((t) => t.id));
  return db.tarefaAnexos.filter((a) => idsDoChassi.has(a.tarefaId));
}

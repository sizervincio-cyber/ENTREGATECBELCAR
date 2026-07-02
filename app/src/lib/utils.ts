import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR");
}

export function daysSince(value: string): number {
  const then = new Date(value).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

export type Urgencia = "vencido" | "hoje" | "proximo" | "em_dia" | "sem_prazo";

export function urgenciaPrazo(prazo: string | null): Urgencia {
  if (!prazo) return "sem_prazo";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(prazo + "T00:00:00");
  const diffDias = Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return "vencido";
  if (diffDias === 0) return "hoje";
  if (diffDias <= 3) return "proximo";
  return "em_dia";
}

export const URGENCIA_LABELS: Record<Urgencia, string> = {
  vencido: "Vencido",
  hoje: "Vence hoje",
  proximo: "Próximo",
  em_dia: "Em dia",
  sem_prazo: "Sem prazo",
};

export const URGENCIA_TONE: Record<Urgencia, "danger" | "warning" | "info" | "neutral"> = {
  vencido: "danger",
  hoje: "warning",
  proximo: "warning",
  em_dia: "neutral",
  sem_prazo: "neutral",
};

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const lines = [headers.map(csvCell).join(";"), ...rows.map((r) => r.map(csvCell).join(";"))];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

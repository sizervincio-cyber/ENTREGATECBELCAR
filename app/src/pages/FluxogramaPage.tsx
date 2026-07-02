import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckSquare, Truck, CalendarDays, AlertTriangle, PackageCheck } from "lucide-react";
import { ExcalidrawFluxo } from "@/components/ExcalidrawFluxo";

const FASE1 = "#6b7280";
const FASE1_BG = "#f3f4f6";
const FASE2 = "#b45309";
const FASE2_BG = "#fef3c7";
const FASE3 = "#15803d";
const FASE3_BG = "#dcfce7";
const NAVY = "#0f2540";
const DANGER = "#dc2626";
const INK = "#12141a";
const MUTED = "#6b7280";

interface StageBox {
  x: number;
  numero: string;
  nome: string;
  fase: 1 | 2 | 3;
}

const BOX_W = 118;
const BOX_H = 64;
const BOX_Y = 70;

const STAGES: StageBox[] = [
  { x: 30, numero: "01", nome: "Aguardando Faturamento", fase: 1 },
  { x: 162, numero: "02", nome: "Faturado", fase: 1 },
  { x: 294, numero: "03", nome: "Em Pátio", fase: 1 },
  { x: 458, numero: "04", nome: "Verificação de Documentação", fase: 2 },
  { x: 590, numero: "05", nome: "Em Preparação", fase: 2 },
  { x: 722, numero: "06", nome: "Qualidade", fase: 2 },
  { x: 854, numero: "07", nome: "Liberado", fase: 2 },
  { x: 1018, numero: "08", nome: "Agendado Cliente", fase: 3 },
  { x: 1150, numero: "09", nome: "Entregue", fase: 3 },
  { x: 1282, numero: "10", nome: "Encerrado", fase: 3 },
];

const FASE_COLOR = { 1: FASE1, 2: FASE2, 3: FASE3 };
const FASE_BG = { 1: FASE1_BG, 2: FASE2_BG, 3: FASE3_BG };

export function FluxogramaPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Fluxograma do Sistema</h1>
        <p className="text-sm text-muted">
          Como a operação enxerga (4 passos, estilo quadro branco) e como o dado é gravado
          (10 estágios) — com todas as regras R1-R10 e os eixos paralelos que nunca viram estágio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visão da operação — 4 passos (quadro branco)</CardTitle>
          <CardDescription>
            Documentação (04) e Qualidade (06) são checklist na hora de avançar; movimentação,
            agenda, pagamento e recall correm em paralelo, ligados por chassi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExcalidrawFluxo />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visão técnica — como o dado é gravado (10 estágios)</CardTitle>
          <CardDescription>
            Todo avanço grava linha por estágio no histórico (R4), mesmo quando a interface dobra
            04 e 06 em checklist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 1450 260" className="w-full" role="img" aria-label="Fluxograma do pipeline de 10 estágios">
            <defs>
              <marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill={NAVY} />
              </marker>
              <marker id="arrow-danger" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill={DANGER} />
              </marker>
            </defs>

            {/* Bandas de fase */}
            <g>
              <rect x={16} y={30} width={412} height={140} rx={14} fill={FASE1_BG} opacity={0.5} />
              <text x={22} y={22} fontSize={13} fontWeight={700} fill={FASE1}>FLUXO INTERNO</text>

              <rect x={444} y={30} width={546} height={140} rx={14} fill={FASE2_BG} opacity={0.5} />
              <text x={450} y={22} fontSize={13} fontWeight={700} fill={FASE2}>CONTROLE</text>

              <rect x={1006} y={30} width={418} height={140} rx={14} fill={FASE3_BG} opacity={0.5} />
              <text x={1012} y={22} fontSize={13} fontWeight={700} fill={FASE3}>ENTREGA</text>
            </g>

            {/* Setas entre estagios consecutivos */}
            {STAGES.slice(0, -1).map((s, i) => {
              const next = STAGES[i + 1];
              const y = BOX_Y + BOX_H / 2;
              return (
                <line
                  key={`arrow-${s.numero}`}
                  x1={s.x + BOX_W} y1={y}
                  x2={next.x - 4} y2={y}
                  stroke={NAVY} strokeWidth={2} markerEnd="url(#arrow)"
                />
              );
            })}

            {/* Loop de reprovacao 06 -> 05 (R3) */}
            <path
              d={`M ${STAGES[5].x + BOX_W / 2} ${BOX_Y + BOX_H} C ${STAGES[5].x + BOX_W / 2} ${BOX_Y + BOX_H + 40}, ${STAGES[4].x + BOX_W / 2} ${BOX_Y + BOX_H + 40}, ${STAGES[4].x + BOX_W / 2} ${BOX_Y + BOX_H + 4}`}
              fill="none" stroke={DANGER} strokeWidth={2} strokeDasharray="5,4" markerEnd="url(#arrow-danger)"
            />
            <text x={(STAGES[4].x + STAGES[5].x) / 2 + BOX_W / 2} y={BOX_Y + BOX_H + 58} fontSize={12} fontWeight={600} fill={DANGER} textAnchor="middle">
              Reprovado (R3): motivo obrigatório
            </text>

            {/* Caixas dos estagios */}
            {STAGES.map((s) => (
              <g key={s.numero}>
                <rect x={s.x} y={BOX_Y} width={BOX_W} height={BOX_H} rx={10} fill="#ffffff" stroke={FASE_COLOR[s.fase]} strokeWidth={2} />
                <rect x={s.x} y={BOX_Y} width={BOX_W} height={22} rx={10} fill={FASE_BG[s.fase]} />
                <text x={s.x + 10} y={BOX_Y + 16} fontSize={12} fontWeight={800} fill={FASE_COLOR[s.fase]}>{s.numero}</text>
                <foreignObject x={s.x + 6} y={BOX_Y + 24} width={BOX_W - 12} height={BOX_H - 26}>
                  <div style={{ fontSize: 11, lineHeight: 1.25, color: INK, fontWeight: 600, fontFamily: "inherit" }}>
                    {s.nome}
                  </div>
                </foreignObject>
              </g>
            ))}

            {/* R1 marcador no estagio 01 */}
            <text x={STAGES[0].x} y={BOX_Y - 6} fontSize={10} fontWeight={700} fill={DANGER}>R1: NF + data fat.</text>
            {/* R2 marcador geral */}
            <text x={STAGES[3].x} y={BOX_Y - 6} fontSize={10} fontWeight={700} fill={DANGER}>R2/R6: sem responsável ou tarefa bloqueante não avança</text>
          </svg>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        <EixoCard
          icon={CheckSquare}
          titulo="Tarefas"
          regra="R5, R6, R7, R8"
          descricao="Checklist por CHASSI: responsável, prazo, custo, anexo. Categorias bloqueantes (recall, avaria, oficina, documentação, qualidade) impedem 06→07 enquanto abertas."
          cor={NAVY}
        />
        <EixoCard
          icon={Truck}
          titulo="Movimentação Física"
          regra="R10 · fila própria 1-8"
          descricao="Criada dentro do chassi, com km de controle e modalidade (rodando/cegonha). Vale para faturados e não faturados — nunca para entregues (R10). Marcar chegada atualiza o local do veículo."
          cor={FASE2}
        />
        <EixoCard
          icon={CalendarDays}
          titulo="Agenda"
          regra="R9 · sempre futura"
          descricao="Entrega só é agendada com a preparação pronta (07 Liberado) e para data futura (R9); agendar avança o veículo para 08. Agenda de Acessórios alimenta Tarefas na Preparação."
          cor={FASE3}
        />
        <EixoCard
          icon={AlertTriangle}
          titulo="Flags de bloqueio"
          regra="nunca é status"
          descricao="Avariado, bateria, recall/campanha, NF cancelada, pagamento pendente — sempre um campo paralelo ao status, nunca um 11º estágio informal."
          cor={DANGER}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Pós-venda (fora do pipeline técnico)</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3 text-sm text-muted">
          <PackageCheck size={16} className="text-belcar-700" />
          Depois de <strong className="text-ink">10 Encerrado</strong>, revisões de 6 meses e 1 ano viram eventos de{" "}
          <code className="rounded bg-background px-1 py-0.5 text-xs">pos_venda_evento</code>, sem reabrir o pipeline principal.
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Regras duras (R1-R10)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <p><strong className="text-ink">R1</strong> — não sai de 01 sem NF e data de faturamento.</p>
          <p><strong className="text-ink">R6</strong> — 06→07 bloqueado com tarefa bloqueante aberta.</p>
          <p><strong className="text-ink">R2</strong> — veículo não avança etapa sem responsável.</p>
          <p><strong className="text-ink">R7</strong> — tarefa bloqueada exige motivo obrigatório.</p>
          <p><strong className="text-ink">R3</strong> — reprovado em 06 volta pra 05 com motivo obrigatório.</p>
          <p><strong className="text-ink">R8</strong> — histórico da tarefa é append-only.</p>
          <p><strong className="text-ink">R4</strong> — histórico do veículo é append-only.</p>
          <p><strong className="text-ink">R9</strong> — entrega só agenda com preparação pronta (07) e data futura.</p>
          <p><strong className="text-ink">R5</strong> — tarefa não vai pra Em Andamento sem responsável.</p>
          <p><strong className="text-ink">R10</strong> — movimentação nunca de veículo entregue/encerrado.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function EixoCard({
  icon: Icon, titulo, regra, descricao, cor,
}: { icon: typeof CheckSquare; titulo: string; regra: string; descricao: string; cor: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${cor}1a`, color: cor }}>
            <Icon size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{titulo}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: MUTED }}>{regra}</p>
          </div>
        </div>
        <p className="text-xs text-muted">{descricao}</p>
      </CardContent>
    </Card>
  );
}

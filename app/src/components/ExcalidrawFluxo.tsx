// Diagrama estilo Excalidraw (hand-drawn/quadro branco) do fluxo da operação:
// 4 passos, checklists 04/06 na transição, loop de reprovação R3 e os eixos
// paralelos (movimentação R10, agenda R9, pagamento, recall). Fonte Excalifont
// carregada em index.css.
const FONT = 'Excalifont, Virgil, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';

const AZUL = "#2c5f8a";
const AZUL_CLARO = "#e3f2fd";
const AZUL_MEDIO = "#90caf9";
const VERDE = "#4a7c59";
const VERDE_CLARO = "#e8f5e9";
const VERDE_MEDIO = "#a8e6a3";
const LARANJA = "#e65100";
const LARANJA_CLARO = "#fff3e0";
const LARANJA_MEDIO = "#ffcc80";
const ROXO = "#7c3aed";
const ROXO_CLARO = "#f3e8ff";
const ROXO_MEDIO = "#d9c2f7";
const AMARELO = "#ffeaa7";
const AMARELO_ESCURO = "#b8860b";
const AMARELO_BOX = "#fff4b4";
const VERMELHO = "#dc2626";
const CINZA = "#6c757d";
const INK = "#333333";

function Badge({ cx, cy, cor, numero }: { cx: number; cy: number; cor: string; numero: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={13} fill={cor} stroke={cor} strokeWidth={2} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#ffffff">{numero}</text>
    </g>
  );
}

export function ExcalidrawFluxo() {
  return (
    <svg
      viewBox="0 0 1460 505"
      className="w-full"
      role="img"
      aria-label="Fluxo da operação em 4 passos, estilo quadro branco: Faturar, Pátio, Preparar e Entregar, com checklists de documentação e qualidade nas transições e os eixos paralelos de movimentação, agenda, pagamento e recall"
      style={{ fontFamily: FONT }}
    >
      <defs>
        <marker id="xd-arrow" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill={INK} />
        </marker>
        <marker id="xd-arrow-red" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill={VERMELHO} />
        </marker>
        <marker id="xd-arrow-gray" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill={CINZA} />
        </marker>
      </defs>

      {/* Notas de regra globais */}
      <text x={1410} y={30} textAnchor="end" fontSize={13} fill={VERMELHO}>R2: sem responsável nenhuma seta anda</text>
      <text x={1410} y={48} textAnchor="end" fontSize={13} fill={CINZA}>R4: todo avanço grava histórico (append-only)</text>

      {/* Início */}
      <ellipse cx={70} cy={138} rx={50} ry={28} fill="#f8f9fa" stroke={CINZA} strokeWidth={2.5} />
      <text x={70} y={143} textAnchor="middle" fontSize={15} fill={INK}>FÁBRICA</text>
      <line x1={120} y1={138} x2={136} y2={138} stroke={INK} strokeWidth={3} markerEnd="url(#xd-arrow)" />

      {/* Passo 1 — FATURAR */}
      <rect x={140} y={60} width={290} height={160} rx={14} fill={AZUL_CLARO} stroke={AZUL} strokeWidth={2.5} />
      <Badge cx={165} cy={85} cor={AZUL} numero="1" />
      <text x={186} y={91} fontSize={17} fill={AZUL}>FATURAR</text>
      <rect x={158} y={110} width={122} height={56} rx={8} fill={AZUL_MEDIO} stroke={AZUL} strokeWidth={2} />
      <text x={219} y={132} textAnchor="middle" fontSize={13} fill={INK}>01 Aguardando</text>
      <text x={219} y={150} textAnchor="middle" fontSize={13} fill={INK}>Faturamento</text>
      <line x1={280} y1={138} x2={292} y2={138} stroke={INK} strokeWidth={3} markerEnd="url(#xd-arrow)" />
      <rect x={296} y={110} width={118} height={56} rx={8} fill={AZUL_MEDIO} stroke={AZUL} strokeWidth={2} />
      <text x={355} y={143} textAnchor="middle" fontSize={14} fill={INK}>02 Faturado</text>
      <text x={285} y={196} textAnchor="middle" fontSize={12} fill={VERMELHO}>R1: não sai sem NF + data de faturamento</text>

      <line x1={430} y1={138} x2={456} y2={138} stroke={INK} strokeWidth={3} markerEnd="url(#xd-arrow)" />

      {/* Passo 2 — PÁTIO */}
      <rect x={460} y={60} width={160} height={160} rx={14} fill={VERDE_CLARO} stroke={VERDE} strokeWidth={2.5} />
      <Badge cx={485} cy={85} cor={VERDE} numero="2" />
      <text x={506} y={91} fontSize={17} fill={VERDE}>PÁTIO</text>
      <rect x={478} y={110} width={124} height={56} rx={8} fill={VERDE_MEDIO} stroke={VERDE} strokeWidth={2} />
      <text x={540} y={143} textAnchor="middle" fontSize={14} fill={INK}>03 Em Pátio</text>

      {/* Checklist 04 na transição */}
      <line x1={620} y1={138} x2={636} y2={138} stroke={INK} strokeWidth={3} markerEnd="url(#xd-arrow)" />
      <rect x={640} y={110} width={115} height={56} rx={8} fill={AMARELO_BOX} stroke={AMARELO_ESCURO} strokeWidth={2} strokeDasharray="6,5" />
      <text x={697} y={133} textAnchor="middle" fontSize={13} fill={INK}>✓ 04 Docs</text>
      <text x={697} y={151} textAnchor="middle" fontSize={11} fill={AMARELO_ESCURO}>checklist ao avançar</text>
      <line x1={755} y1={138} x2={771} y2={138} stroke={INK} strokeWidth={3} markerEnd="url(#xd-arrow)" />

      {/* Passo 3 — PREPARAR */}
      <rect x={775} y={60} width={180} height={160} rx={14} fill={LARANJA_CLARO} stroke={LARANJA} strokeWidth={2.5} />
      <Badge cx={800} cy={85} cor={LARANJA} numero="3" />
      <text x={821} y={91} fontSize={17} fill={LARANJA}>PREPARAR</text>
      <rect x={793} y={110} width={144} height={56} rx={8} fill={LARANJA_MEDIO} stroke={LARANJA} strokeWidth={2} />
      <text x={865} y={131} textAnchor="middle" fontSize={13} fill={INK}>05 Em Preparação</text>
      <text x={865} y={150} textAnchor="middle" fontSize={11} fill={LARANJA}>tarefas · R5-R8</text>

      {/* Checklist 06 na transição */}
      <line x1={955} y1={138} x2={971} y2={138} stroke={INK} strokeWidth={3} markerEnd="url(#xd-arrow)" />
      <rect x={975} y={110} width={115} height={56} rx={8} fill={AMARELO_BOX} stroke={AMARELO_ESCURO} strokeWidth={2} strokeDasharray="6,5" />
      <text x={1032} y={133} textAnchor="middle" fontSize={13} fill={INK}>✓ 06 Qualidade</text>
      <text x={1032} y={151} textAnchor="middle" fontSize={11} fill={AMARELO_ESCURO}>checklist · R6 trava</text>
      <line x1={1090} y1={138} x2={1106} y2={138} stroke={INK} strokeWidth={3} markerEnd="url(#xd-arrow)" />

      {/* Loop de reprovação R3 */}
      <path
        d="M 1032 166 C 1032 250, 865 250, 865 170"
        fill="none" stroke={VERMELHO} strokeWidth={2.5} strokeDasharray="7,5" markerEnd="url(#xd-arrow-red)"
      />
      <text x={950} y={268} textAnchor="middle" fontSize={12} fill={VERMELHO}>R3: reprovado volta com motivo obrigatório</text>

      {/* Passo 4 — ENTREGAR */}
      <rect x={1110} y={60} width={300} height={160} rx={14} fill={ROXO_CLARO} stroke={ROXO} strokeWidth={2.5} />
      <Badge cx={1135} cy={85} cor={ROXO} numero="4" />
      <text x={1156} y={91} fontSize={17} fill={ROXO}>ENTREGAR</text>
      <rect x={1126} y={110} width={82} height={56} rx={8} fill={ROXO_MEDIO} stroke={ROXO} strokeWidth={2} />
      <text x={1167} y={132} textAnchor="middle" fontSize={13} fill={INK}>07</text>
      <text x={1167} y={150} textAnchor="middle" fontSize={12} fill={INK}>Liberado</text>
      <line x1={1208} y1={138} x2={1218} y2={138} stroke={INK} strokeWidth={3} markerEnd="url(#xd-arrow)" />
      <rect x={1222} y={110} width={82} height={56} rx={8} fill={ROXO_MEDIO} stroke={ROXO} strokeWidth={2} />
      <text x={1263} y={132} textAnchor="middle" fontSize={13} fill={INK}>08</text>
      <text x={1263} y={150} textAnchor="middle" fontSize={12} fill={INK}>Agendado</text>
      <line x1={1304} y1={138} x2={1314} y2={138} stroke={INK} strokeWidth={3} markerEnd="url(#xd-arrow)" />
      <rect x={1318} y={110} width={80} height={56} rx={8} fill={ROXO_MEDIO} stroke={ROXO} strokeWidth={2} />
      <text x={1358} y={132} textAnchor="middle" fontSize={13} fill={INK}>09</text>
      <text x={1358} y={150} textAnchor="middle" fontSize={12} fill={INK}>Entregue</text>
      <text x={1260} y={200} textAnchor="middle" fontSize={11} fill={ROXO}>→ 10 Encerrado · pós-venda (revisões 6m / 1 ano)</text>

      {/* Conector com os eixos paralelos */}
      <line x1={730} y1={258} x2={730} y2={296} stroke={CINZA} strokeWidth={2} strokeDasharray="5,5" markerEnd="url(#xd-arrow-gray)" />
      <text x={744} y={280} fontSize={12} fill={CINZA}>ligados por CHASSI</text>

      {/* Eixos paralelos */}
      <rect x={140} y={300} width={1270} height={170} rx={14} fill={AMARELO} fillOpacity={0.45} stroke={AMARELO_ESCURO} strokeWidth={2.5} />
      <text x={160} y={332} fontSize={17} fill={AMARELO_ESCURO}>EIXOS PARALELOS — nunca viram estágio</text>

      <rect x={160} y={348} width={290} height={104} rx={8} fill="#fffdf5" stroke={AMARELO_ESCURO} strokeWidth={2} />
      <text x={305} y={374} textAnchor="middle" fontSize={15} fill={INK}>🚚 Movimentação</text>
      <text x={305} y={396} textAnchor="middle" fontSize={12} fill={VERMELHO}>R10: nunca de veículo entregue</text>
      <text x={305} y={414} textAnchor="middle" fontSize={12} fill="#444444">km + rodando ou cegonha</text>
      <text x={305} y={432} textAnchor="middle" fontSize={12} fill="#444444">criada dentro do chassi</text>

      <rect x={467} y={348} width={290} height={104} rx={8} fill="#fffdf5" stroke={AMARELO_ESCURO} strokeWidth={2} />
      <text x={612} y={374} textAnchor="middle" fontSize={15} fill={INK}>📅 Agenda de Entrega</text>
      <text x={612} y={396} textAnchor="middle" fontSize={12} fill={VERMELHO}>R9: só com preparação pronta (07)</text>
      <text x={612} y={414} textAnchor="middle" fontSize={12} fill="#444444">sempre data futura</text>
      <text x={612} y={432} textAnchor="middle" fontSize={12} fill="#444444">agendar → avança pra 08</text>

      <rect x={774} y={348} width={290} height={104} rx={8} fill="#fffdf5" stroke={AMARELO_ESCURO} strokeWidth={2} />
      <text x={919} y={374} textAnchor="middle" fontSize={15} fill={INK}>💰 Pagamento</text>
      <text x={919} y={396} textAnchor="middle" fontSize={12} fill="#444444">PAGO / NÃO — flag paralela</text>
      <text x={919} y={414} textAnchor="middle" fontSize={12} fill="#444444">pendência visível no painel</text>
      <text x={919} y={432} textAnchor="middle" fontSize={12} fill="#444444">não trava o pipeline</text>

      <rect x={1081} y={348} width={290} height={104} rx={8} fill="#fffdf5" stroke={AMARELO_ESCURO} strokeWidth={2} />
      <text x={1226} y={374} textAnchor="middle" fontSize={15} fill={INK}>⚠️ Recall &amp; Flags</text>
      <text x={1226} y={396} textAnchor="middle" fontSize={12} fill="#444444">avaria · bateria · oficina · NF canc.</text>
      <text x={1226} y={414} textAnchor="middle" fontSize={12} fill="#444444">badge ao lado do status</text>
      <text x={1226} y={432} textAnchor="middle" fontSize={12} fill={VERMELHO}>bloqueantes seguram a liberação (R6)</text>
    </svg>
  );
}

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL: planilha real Belcar (CSV) -> pipeline de 10 estagios (Torre de Controle).
Le os CSVs exportados do Google Sheets, aplica o DE-PARA ja fechado
(docs/de-para-status.md) e gera:
  - out/seed_data.json  (para o app React consumir)
  - out/seed.sql         (INSERTs reais para db/seed.sql)
  - out/report.txt       (estatisticas + amostras p/ conferencia)
"""
import csv
import json
import os
import re
import sys
import uuid
import hashlib
from collections import defaultdict, Counter

CSV_DIR = r"G:\Meu Drive\belcar\csv"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT_DIR, exist_ok=True)

def read_csv(fname, skip=2):
    path = os.path.join(CSV_DIR, fname)
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = list(csv.reader(f))
    return reader[skip:]  # skip title row + header row

# -----------------------------------------------------------------------
# Deterministic UUIDs (stable across re-runs) from a namespace + key
# -----------------------------------------------------------------------
NS = uuid.UUID("7c9f7f1e-2b3a-4a5b-8c6d-1e2f3a4b5c6d")
def uid(*parts):
    key = "|".join(str(p) for p in parts)
    return str(uuid.uuid5(NS, key))

def clean(s):
    if s is None:
        return None
    s = s.strip()
    return s if s else None

def upper_clean(s):
    s = clean(s)
    return s.upper() if s else None

# -----------------------------------------------------------------------
# Normalizacao de VENDEDOR (merge de duplicatas conhecidas + inferidas)
# -----------------------------------------------------------------------
VENDEDOR_ALIASES = {
    "LUIS CARLOS": "LUIZ CARLOS",
    "VALERIA": "WALERIA",
    "GADIMÃ": "GADMA",
    "GADIMA": "GADMA",
    "FERNANDO GER.": "FERNANDO",
    "FERNANDO - PEDIU": "FERNANDO",
    "FERANDO - PEDIU": "FERNANDO",
    "FERNANDO GERENTE": "FERNANDO",
}
NON_VENDOR_TOKENS = {
    "CLIENTE", "ESTOQUE", "DESTINO", "MOVIMENTAR", "", None,
}

# Alocacao restrita: os 21 vendedores documentados (docs/documentacao-entrega-
# tecnica-belcar.md) + 2 nomes reais novos, confirmados por frequencia alta e
# consistente nos dados (CARLOS MARANHAO, FERNANDO). Algumas linhas de
# CAMINHOES ENTREGUES.csv tem dado de entrada trocado de coluna (usuario real
# colou em campo errado) e "vazam" lixo pra essa coluna (SIM, NAO, OK, JRV,
# MARKETING, nomes de cliente truncados etc.) - nao viram vendedor novo.
VENDEDOR_ALLOWLIST = {
    "ENEIAS", "JORGE", "EURIPEDES", "LUIZ CLAUDIO", "DOUGLAS", "GUSTAVO",
    "GUILHERME", "MARIANA", "RUI", "PAULO", "CRISTIANO", "FRANK",
    "LUIZ CARLOS", "CARLOS", "WALERIA", "GADMA", "DANIELITON", "KRISLEY",
    "JOSUE", "LAILA", "CARLOS MARANHAO", "FERNANDO",
}

rejected_vendedores = Counter()

def normalize_vendedor(raw):
    v = upper_clean(raw)
    if not v or v in NON_VENDOR_TOKENS:
        return None
    v = re.sub(r"\s+", " ", v)
    v = VENDEDOR_ALIASES.get(v, v)
    if v not in VENDEDOR_ALLOWLIST:
        rejected_vendedores[v] += 1
        return None
    return v

# -----------------------------------------------------------------------
# Normalizacao de LOCAL
# -----------------------------------------------------------------------
LOCAL_ALIASES = {
    "EM VIAJEM - GABARDO": "EM TRANSITO - GABARDO",
    "EM TRANSITO - GABARDO": "EM TRANSITO - GABARDO",
    "EXPOSIÇÃO / EVENTO": "EXPOSICAO/EVENTO",
    "EXPOSIÇÃO/EVENTO": "EXPOSICAO/EVENTO",
    "EXPOSIÇÃO": "EXPOSICAO/EVENTO",
    "GABADO RJ": "GABARDO RJ",
    "GABADO ANS": "ANS",
    "GABARDO - ANS": "ANS",
    "VER ONDE ESTA": "SEM DESTINO",
    "DESTINO": "DESTINO",
    "ANÁPOLIS": "ANAPOLIS",
}
# Locais documentados (20) + achados reais plausiveis (cidade/destino real,
# nao lixo de coluna trocada) - ver perguntas-negocio.md
LOCAL_ALLOWLIST = {
    "ANS", "AGENDADO", "DESTINO", "EM TRANSITO - GABARDO", "EXPOSICAO/EVENTO",
    "FABRICA", "FACCHINI", "GABARDO RJ", "GABARDO SP", "HOLMES",
    "IMPLEMENTADOR", "ITUMBIARA", "JRV", "PATIO 1", "PATIO 2", "REMESSA ANS",
    "SEMI NOVOS", "SHOWROOM", "MOVIMENTAR", "CLIENTE", "SEM DESTINO",
    "ANAPOLIS", "JBS - ANS", "CLIENTE VOLTAR",
}

rejected_locais = Counter()

def normalize_local(raw):
    l = upper_clean(raw)
    if not l:
        return None
    l = re.sub(r"\s+", " ", l)
    l = LOCAL_ALIASES.get(l, l)
    if l not in LOCAL_ALLOWLIST:
        rejected_locais[l] += 1
        return None
    return l

# -----------------------------------------------------------------------
# Normalizacao de IMPLEMENTO
# -----------------------------------------------------------------------
IMPLEMENTO_ALIASES = {
    "BAU - JRV": "BAU-JRV",
    "BAU - FACCHINI": "BAU-FACCHINI",
    "CAÇAMBA - FACCHINI": "CACAMBA-FACCHINI",
    "CAÇAMBA - JRV": "CACAMBA-JRV",
    "CACAMBA - JRV": "CACAMBA-JRV",
    "CACAMBA - FACCHINI": "CACAMBA-FACCHINI",
    "PRANCHA - JRV": "PRANCHA-JRV",
    "PIPA - JRV": "PIPA-JRV",
    "PIPA - JRV ": "PIPA-JRV",
}
# Estritamente os 18 valores documentados. Linhas com dado trocado de coluna
# (data, numero de OS, cor) vazam pra essa coluna em CAMINHOES ENTREGUES.csv -
# descartadas (implementoId = None) em vez de virar tipo de implemento falso.
IMPLEMENTO_ALLOWLIST = {
    "BAU", "BAU-JRV", "BAU-FACCHINI", "CARROC. FLACH", "CARROC. JRV",
    "CACAMBA-FACCHINI", "CACAMBA-JRV", "FLACH", "NENHUM", "OUTRO",
    "PRANCHA-JRV", "ROLON OFF", "SIDER", "THERMO POINT", "VAI COLOCAR",
    "IMPLEMENTANDO", "PIPA-JRV", "PIPA",
}

rejected_implementos = Counter()

def normalize_implemento(raw):
    i = upper_clean(raw)
    if not i:
        return None
    i = re.sub(r"\s+", " ", i)
    i = IMPLEMENTO_ALIASES.get(i, i)
    if i not in IMPLEMENTO_ALLOWLIST:
        rejected_implementos[i] += 1
        return None
    return i

# -----------------------------------------------------------------------
# DE-PARA de status -> pipeline de 10 estagios (ver docs/de-para-status.md)
# -----------------------------------------------------------------------
STAGE_01 = "01_aguardando_faturamento"
STAGE_02 = "02_faturado"
STAGE_03 = "03_em_patio"
STAGE_04 = "04_verificacao_documentacao"
STAGE_05 = "05_em_preparacao"
STAGE_06 = "06_qualidade"
STAGE_07 = "07_liberado"
STAGE_08 = "08_agendado_cliente"
STAGE_09 = "09_entregue"
STAGE_10 = "10_encerrado"

COMERCIAL_TO_STAGE = {
    "FATURADO": STAGE_02,
    "ESTOQUE": STAGE_03,
    "VENDA DIRETA": STAGE_02,
}
COMERCIAL_TO_TIPO_VENDA = {
    "VENDA DIRETA": "venda_direta",
}

# status operacional (coluna U de ESTOQUE / STATUS de PROGRAMACAO-CAMINHOES)
OPERACIONAL_TO_STAGE = {
    "ACESSORIOS": STAGE_05,
    "LAVAR": STAGE_05,
    "LAVADO": STAGE_06,
    "AGENDAR": STAGE_07,
    "AGENDADO": STAGE_08,
    "ENTREGUE": STAGE_09,
    "ENTREGA ITUMBIARA": STAGE_09,
    "AVARIADO": STAGE_05,
    "BATERIA": STAGE_05,
    "OFICINA FALHAS": STAGE_05,
    "OFICINA PARAM.": STAGE_05,
    "MOVIMENTAR": STAGE_03,
    "NF CANCELADA": STAGE_01,
    "USADO": STAGE_03,
    "SEMI NOVOS": STAGE_03,
    "FUTURA VENDA": STAGE_03,
}
POS_VENDA_TOKENS = {
    "REVISAO DE 6 MESES": "revisao_6_meses",
    "REVISÃO 6 MESES": "revisao_6_meses",
    "REVISAO 6 MESES": "revisao_6_meses",
    "REVISAO DE 1 ANO": "revisao_1_ano",
    "REVISÃO 1 ANO": "revisao_1_ano",
    "REVISAO 1 ANO": "revisao_1_ano",
}

def norm_status_token(s):
    if not s:
        return None
    s = upper_clean(s)
    s = re.sub(r"\s+", " ", s)
    return s

RECALL_MAP = {
    "TEM": "tem",
    "NÃO TEM": "nao_tem",
    "NAO TEM": "nao_tem",
    "EM SERVIÇO": "em_servico",
    "EM SERVICO": "em_servico",
    "REALIZADA": "realizada",
    "NÃO TEM PEÇA": "nao_tem_peca",
    "NAO TEM PECA": "nao_tem_peca",
}

def parse_pago(raw):
    v = upper_clean(raw)
    return v == "PAGO"

def parse_valor(raw):
    v = clean(raw)
    if not v:
        return None
    v = v.replace("R$", "").strip()
    v = v.replace(".", "").replace(",", ".")
    try:
        return round(float(v), 2)
    except ValueError:
        return None

DATE_RE = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$")
def parse_date(raw):
    v = clean(raw)
    if not v:
        return None
    m = DATE_RE.match(v)
    if not m:
        return None
    d, mo, y = m.groups()
    d, mo = int(d), int(mo)
    if len(y) == 2:
        y = "20" + y
    y = int(y)
    if mo < 1 or mo > 12 or d < 1 or d > 31:
        return None
    if y < 2020 or y > 2030:
        return None
    return f"{y:04d}-{mo:02d}-{d:02d}"

IMPORT_TS = "2026-07-01T12:00:00.000Z"

def iso_ts(date_str):
    # createdAt/updatedAt do veiculo: usa a data real mais relevante disponivel
    # (fatura/entrega) como timestamp, senao cai no timestamp da importacao.
    if not date_str:
        return IMPORT_TS
    return f"{date_str}T12:00:00.000Z"

# =========================================================================
# Referencias: vendedor / local / implemento (descobertos nos dados reais)
# =========================================================================
vendedores = {}   # nome_canonico -> {id, nome, aliases:set}
locais = {}
implementos = {}
motivos_reprovacao = {}

def get_vendedor_id(raw):
    nome = normalize_vendedor(raw)
    if not nome:
        return None
    if nome not in vendedores:
        vendedores[nome] = {"id": uid("vendedor", nome), "nome": nome, "aliases": set()}
    if raw and upper_clean(raw) != nome:
        vendedores[nome]["aliases"].add(upper_clean(raw))
    return vendedores[nome]["id"]

def get_local_id(raw):
    nome = normalize_local(raw)
    if not nome:
        return None
    if nome not in locais:
        locais[nome] = {"id": uid("local", nome), "nome": nome, "aliases": set()}
    if raw and upper_clean(raw) != nome:
        locais[nome]["aliases"].add(upper_clean(raw))
    return locais[nome]["id"]

def get_implemento_id(raw):
    nome = normalize_implemento(raw)
    if not nome:
        return None
    if nome not in implementos:
        implementos[nome] = {"id": uid("implemento", nome), "nome": nome}
    return implementos[nome]["id"]

# =========================================================================
# 1) ESTOQUE.csv
# CHASSI,VEICULO,COR,FATUR.fabri.,CLIENTE,STATUS,LOCAL-HOJE,MOVIMENTACAO DESTINO,
# DATA SOLIC.,ENTREGA,DATA DE FAT.,NF,VENDEDOR,PAGO,ACS.,OS,RECALL,VALOR,
# ACESSORIOS/RECALL,TIPO,STATUS(operacional),OBS,OBS:
# =========================================================================
def load_estoque():
    rows = read_csv("Cópia de ENTREGA TECNICA - ESTOQUE.csv")
    out = {}
    stats = Counter()
    pos_venda_events = []
    for r in rows:
        r = r + [""] * (23 - len(r))
        chassi = clean(r[0])
        if not chassi:
            continue
        veiculo = clean(r[1]) or "SEM MODELO"
        cor = clean(r[2])
        fatur_fabrica = parse_date(r[3])
        cliente = clean(r[4])
        if cliente and cliente.upper() == "ESTOQUE BELCAR":
            cliente = None
        status_comercial = upper_clean(r[5])
        local_hoje = get_local_id(r[6])
        mov_destino = norm_status_token(r[7])
        data_fat = parse_date(r[10])
        nf = clean(r[11])
        vendedor_id = get_vendedor_id(r[12])
        pago = parse_pago(r[13])
        recall_raw = upper_clean(r[16])
        valor = parse_valor(r[17])
        obs = clean(r[21])
        obs2 = clean(r[22])
        observacoes = " | ".join([x for x in [obs, obs2] if x]) or None

        # status: comercial manda o estagio base; mov_destino (coluna operacional
        # embutida em MOVIMENTACAO DESTINO) refina p/ flags e pos-venda
        stage = COMERCIAL_TO_STAGE.get(status_comercial, STAGE_03)
        tipo_venda = COMERCIAL_TO_TIPO_VENDA.get(status_comercial, "padrao")

        avariado = False
        pendencia_bateria = False
        pendencia_oficina = None
        nf_cancelada = False
        local_entrega_especial = None
        pos_venda_tipo = None

        if mov_destino:
            if mov_destino in POS_VENDA_TOKENS:
                pos_venda_tipo = POS_VENDA_TOKENS[mov_destino]
            elif mov_destino in OPERACIONAL_TO_STAGE:
                stage = OPERACIONAL_TO_STAGE[mov_destino]
                if mov_destino == "AVARIADO":
                    avariado = True
                elif mov_destino == "BATERIA":
                    pendencia_bateria = True
                elif mov_destino == "OFICINA FALHAS":
                    pendencia_oficina = "falhas"
                elif mov_destino == "OFICINA PARAM.":
                    pendencia_oficina = "parametrizacao"
                elif mov_destino == "NF CANCELADA":
                    nf_cancelada = True
                elif mov_destino == "USADO":
                    tipo_venda = "usado"
                elif mov_destino == "SEMI NOVOS":
                    tipo_venda = "semi_novo"
                elif mov_destino == "FUTURA VENDA":
                    tipo_venda = "futura_venda"
                elif mov_destino == "ENTREGA ITUMBIARA":
                    local_entrega_especial = "ITUMBIARA"

        # R1: sem NF/data_fat, nao pode estar alem de 01 -> normaliza
        if stage != STAGE_01 and (not nf or not data_fat) and status_comercial == "ESTOQUE":
            stage = STAGE_01 if not nf else stage

        recall_status = RECALL_MAP.get(recall_raw, "nao_tem")

        if pos_venda_tipo:
            pos_venda_events.append({
                "id": uid("posvenda", chassi, pos_venda_tipo, "estoque", len(pos_venda_events)),
                "chassi": chassi, "tipo": pos_venda_tipo,
                "dataEvento": None, "status": mov_destino,
            })

        rec = {
            "chassi": chassi,
            "veiculo": veiculo,
            "cor": cor,
            "cliente": cliente,
            "statusAtual": stage,
            "responsavelId": vendedor_id,
            "localAtualId": local_hoje,
            "implementoId": None,
            "vendedorId": vendedor_id,
            "tipoVenda": tipo_venda,
            "nf": nf,
            "dataFaturamento": data_fat,
            "dataFaturamentoFabrica": fatur_fabrica,
            "pago": pago,
            "recallStatus": recall_status,
            "avariado": avariado,
            "pendenciaBateria": pendencia_bateria,
            "pendenciaOficina": pendencia_oficina,
            "nfCancelada": nf_cancelada,
            "localEntregaEspecial": local_entrega_especial,
            "valor": valor,
            "observacoes": observacoes,
            "createdAt": iso_ts(fatur_fabrica),
            "updatedAt": iso_ts(data_fat or fatur_fabrica),
            "_source": "ESTOQUE",
            "_posVendaTipo": pos_venda_tipo,
        }
        out[chassi] = rec  # last row wins on duplicate chassi within file
        stats[status_comercial or "(vazio)"] += 1
    return out, stats, pos_venda_events

# =========================================================================
# 2) CAMINHOES ENTREGUES.csv (vira estagio 09/10 - fonte de verdade p/ ja entregues)
# CHASSI,VEICULO,OS,IMPLEMENTO,(blank),STATUS,CLIENTE,LOCAL,ACES.,PAGO,CAMPANHA,
# LOCAL,VENDA DT,NF,VENDEDOR,DT ENT.,HR ENT.,(blank),VALOR,OS.,ACESSORIOS,...(lixo)
# =========================================================================
def load_entregues():
    rows = read_csv("Cópia de ENTREGA TECNICA - CAMINHÕES ENTREGUES.csv")
    out = {}
    pos_venda_events = []
    for r in rows:
        r = r + [""] * (21 - len(r))
        chassi = clean(r[0])
        if not chassi:
            continue
        veiculo = clean(r[1]) or "SEM MODELO"
        implemento_id = get_implemento_id(r[3])
        status_raw = norm_status_token(r[5])
        cliente = clean(r[6])
        local_raw = r[7]
        pago = parse_pago(r[9])
        campanha_raw = upper_clean(r[10])
        venda_dt = parse_date(r[12])
        nf = clean(r[13])
        vendedor_id = get_vendedor_id(r[14])
        dt_ent = parse_date(r[15])
        valor = parse_valor(r[18])
        acessorios_desc = clean(r[20])

        recall_status = RECALL_MAP.get(campanha_raw, "nao_tem")

        if status_raw in POS_VENDA_TOKENS:
            pos_venda_events.append({
                "id": uid("posvenda", chassi, status_raw, "entregues", len(pos_venda_events)),
                "chassi": chassi, "tipo": POS_VENDA_TOKENS[status_raw],
                "dataEvento": None, "status": status_raw,
            })
            continue  # nao sobrescreve o veiculo com um evento de pos-venda

        stage = STAGE_09
        local_entrega_especial = None
        if status_raw == "ENTREGA ITUMBIARA" or (cliente and "ITUMBIARA" in cliente.upper()):
            local_entrega_especial = "ITUMBIARA"

        rec = {
            "chassi": chassi,
            "veiculo": veiculo,
            "cor": None,
            "cliente": cliente,
            "statusAtual": stage,
            "responsavelId": vendedor_id,
            "localAtualId": get_local_id("CLIENTE"),
            "implementoId": implemento_id,
            "vendedorId": vendedor_id,
            "tipoVenda": "padrao",
            "nf": nf,
            "dataFaturamento": venda_dt,
            "dataFaturamentoFabrica": None,
            "pago": pago,
            "recallStatus": recall_status,
            "avariado": False,
            "pendenciaBateria": False,
            "pendenciaOficina": None,
            "nfCancelada": False,
            "localEntregaEspecial": local_entrega_especial,
            "valor": valor,
            "observacoes": acessorios_desc,
            "createdAt": iso_ts(venda_dt),
            "updatedAt": iso_ts(dt_ent or venda_dt),
            "_source": "CAMINHOES_ENTREGUES",
            "_dtEnt": dt_ent,
        }
        out[chassi] = rec  # last wins (mais recente / mais completo)
    return out, pos_venda_events

# =========================================================================
# 2.1) PROGRAMAÇÃO.csv — mesma estrutura de colunas de CAMINHÕES ENTREGUES,
# mas é a Fase 2 (Controle) do pipeline: veiculo ja faturado, em preparo/
# handoff, NÃO entregue ainda. STATUS aqui carrega os tokens operacionais
# (ACESSÓRIOS, AGENDAR, AGENDADO, AVARIADO, USADO, SEMI NOVOS, MOVIMENTAR,
# ENTREGA ITUMBIARA, REVISAO...) — exatamente os documentados no DE-PARA.
# Prioridade: sobrescreve ESTOQUE (mais especifico), mas CAMINHOES_ENTREGUES
# (estado terminal) sempre vence se o mesmo chassi aparecer nas duas.
# =========================================================================
def load_programacao():
    rows = read_csv("Cópia de ENTREGA TECNICA - PROGRAMAÇÃO.csv")
    out = {}
    pos_venda_events = []
    for r in rows:
        r = r + [""] * (21 - len(r))
        chassi = clean(r[0])
        if not chassi:
            continue
        veiculo = clean(r[1]) or "SEM MODELO"
        implemento_id = get_implemento_id(r[3])
        status_raw = norm_status_token(r[5])
        cliente = clean(r[6])
        if cliente and cliente.upper().startswith("ESTOQUE BELCAR"):
            cliente = None
        local_id = get_local_id(r[7])
        pago = parse_pago(r[9])
        campanha_raw = upper_clean(r[10])
        venda_dt = parse_date(r[12])
        nf = clean(r[13])
        vendedor_id = get_vendedor_id(r[14])
        dt_ent = parse_date(r[15])
        valor = parse_valor(r[18])
        acessorios_desc = clean(r[20])

        recall_status = RECALL_MAP.get(campanha_raw, "nao_tem")

        if status_raw in POS_VENDA_TOKENS:
            pos_venda_events.append({
                "id": uid("posvenda", chassi, status_raw, "programacao", len(pos_venda_events)),
                "chassi": chassi, "tipo": POS_VENDA_TOKENS[status_raw],
                "dataEvento": None, "status": status_raw,
            })
            continue

        # Fallback: sem token operacional especifico, mas ja programado pra
        # preparo/entrega -> 05 Em Preparacao (nao existe token real pra 04).
        stage = STAGE_05
        tipo_venda = "padrao"
        avariado = False
        pendencia_bateria = False
        pendencia_oficina = None
        local_entrega_especial = None

        if status_raw in OPERACIONAL_TO_STAGE:
            stage = OPERACIONAL_TO_STAGE[status_raw]
            if status_raw == "AVARIADO":
                avariado = True
            elif status_raw == "BATERIA":
                pendencia_bateria = True
            elif status_raw == "OFICINA FALHAS":
                pendencia_oficina = "falhas"
            elif status_raw == "OFICINA PARAM.":
                pendencia_oficina = "parametrizacao"
            elif status_raw == "USADO":
                tipo_venda = "usado"
            elif status_raw == "SEMI NOVOS":
                tipo_venda = "semi_novo"
            elif status_raw == "FUTURA VENDA":
                tipo_venda = "futura_venda"
            elif status_raw == "ENTREGA ITUMBIARA":
                local_entrega_especial = "ITUMBIARA"

        rec = {
            "chassi": chassi,
            "veiculo": veiculo,
            "cor": None,
            "cliente": cliente,
            "statusAtual": stage,
            "responsavelId": vendedor_id,
            "localAtualId": local_id,
            "implementoId": implemento_id,
            "vendedorId": vendedor_id,
            "tipoVenda": tipo_venda,
            "nf": nf,
            "dataFaturamento": venda_dt,
            "dataFaturamentoFabrica": None,
            "pago": pago,
            "recallStatus": recall_status,
            "avariado": avariado,
            "pendenciaBateria": pendencia_bateria,
            "pendenciaOficina": pendencia_oficina,
            "nfCancelada": False,
            "localEntregaEspecial": local_entrega_especial,
            "valor": valor,
            "observacoes": acessorios_desc,
            "createdAt": iso_ts(venda_dt),
            "updatedAt": iso_ts(dt_ent or venda_dt),
            "_source": "PROGRAMACAO",
        }
        out[chassi] = rec
    return out, pos_venda_events

# =========================================================================
# 2.2) ESTOQUE SHOWROOM 1 - copia.csv — recorte de ESTOQUE focado em local
# atual/showroom, sem coluna de status propria. So enriquece: contribui
# chassi NOVOS (nao vistos em ESTOQUE/PROGRAMACAO/CAMINHOES_ENTREGUES) como
# 03 Em Patio, e nunca sobrescreve um veiculo ja conhecido de outra fonte.
# Para no marcador "SUBSTITUIÇÃO DE BAÚS" (secao de outra natureza, log de
# troca de implemento, nao é lista de veiculos).
# =========================================================================
def load_estoque_showroom():
    rows = read_csv("Cópia de ENTREGA TECNICA - ESTOQUE SHOWROOM 1 - copia.csv")
    out = {}
    for r in rows:
        if r and clean(r[0]) and "SUBSTITUIÇÃO" in clean(r[0]).upper():
            break
        r = r + [""] * (20 - len(r))
        chassi = clean(r[0])
        if not chassi:
            continue
        veiculo = clean(r[1]) or "SEM MODELO"
        cor = clean(r[2])
        fatur = parse_date(r[3])
        cliente = clean(r[4])
        if cliente and cliente.upper().startswith("ESTOQUE BELCAR"):
            cliente = None
        local_id = get_local_id(r[5])
        data_fat = parse_date(r[9])
        nf = clean(r[10])
        vendedor_id = get_vendedor_id(r[11])
        pago = parse_pago(r[12])
        recall_raw = upper_clean(r[14])
        recall_status = RECALL_MAP.get(recall_raw, "nao_tem")
        obs = clean(r[18])

        out[chassi] = {
            "chassi": chassi,
            "veiculo": veiculo,
            "cor": cor,
            "cliente": cliente,
            "statusAtual": STAGE_01 if not nf else STAGE_03,
            "responsavelId": vendedor_id,
            "localAtualId": local_id,
            "implementoId": None,
            "vendedorId": vendedor_id,
            "tipoVenda": "padrao",
            "nf": nf,
            "dataFaturamento": data_fat,
            "dataFaturamentoFabrica": fatur,
            "pago": pago,
            "recallStatus": recall_status,
            "avariado": False,
            "pendenciaBateria": False,
            "pendenciaOficina": None,
            "nfCancelada": False,
            "localEntregaEspecial": None,
            "valor": None,
            "observacoes": obs,
            "createdAt": iso_ts(fatur),
            "updatedAt": iso_ts(data_fat or fatur),
            "_source": "ESTOQUE_SHOWROOM",
        }
    return out

# =========================================================================
# 3) MOVIMENTACAO BELCAR.csv
# CHASSI,CLIENTE,VENDEDOR,DATA,MODELO,STATUS,RETIRADA,DATA RETIRADA-OBS,
# ENVIAR PARA,DATA CHEGADA,MOTORISTA
# =========================================================================
PRIORIDADE_MAP = {
    "1": "1_hoje", "1 HOJE": "1_hoje", "HOJE": "1_hoje",
    "2": "2_amanha", "2 AMANHÃ": "2_amanha", "AMANHÃ": "2_amanha", "AMANHA": "2_amanha",
    "3": "3_agendado", "3 AGENDADO": "3_agendado",
    "4": "4_na_fila", "4 NA FILA": "4_na_fila", "NA FILA": "4_na_fila",
    "5": "5_remessa_ans", "5 REMESSA ANS": "5_remessa_ans", "REMESSA ANS": "5_remessa_ans",
    "6": "6_finalizado", "6 FINALIZADO": "6_finalizado", "FINALIZADO": "6_finalizado",
    "7": "7_onde_esta", "7 ONDE ESTÁ?": "7_onde_esta", "ONDE ESTÁ?": "7_onde_esta",
    "8": "8_aguard_pagamento", "8 AGUARD. PG": "8_aguard_pagamento", "AGUARD. PG": "8_aguard_pagamento",
}
def parse_prioridade(raw):
    v = upper_clean(raw)
    if not v:
        return "6_finalizado"
    v = re.sub(r"\s+", " ", v)
    return PRIORIDADE_MAP.get(v, "6_finalizado")

def load_movimentacao():
    rows = read_csv("Cópia de ENTREGA TECNICA - MOVIMENTAÇÃO BELCAR.csv")
    out = []
    for r in rows:
        r = r + [""] * (11 - len(r))
        chassi = clean(r[0])
        if not chassi:
            continue
        vendedor_id = get_vendedor_id(r[2])
        data_solic = parse_date(r[3]) or "2026-01-01"
        prioridade = parse_prioridade(r[5])
        origem_id = get_local_id(r[6])
        data_retirada = parse_date(r[7])
        destino_id = get_local_id(r[8])
        data_chegada = parse_date(r[9])
        motorista = clean(r[10])
        out.append({
            "id": uid("mov", chassi, r[3], len(out)),
            "chassi": chassi,
            "prioridade": prioridade,
            "origemLocalId": origem_id,
            "destinoLocalId": destino_id,
            "motorista": motorista,
            "dataSolicitacao": data_solic,
            "dataRetirada": data_retirada,
            "dataChegada": data_chegada,
            "observacoes": clean(r[1]),
        })
    return out

# =========================================================================
# 4) AGENDA 2026.csv
# DATA,DIA,DIA,HORA,CHASSI,MODELO,CLIENTE,VENDEDOR,LAVADO,ACES.,ENTREGADOR,
# MODALIDADE,AGENDAMENTO,STATUS,OBS: POS ENTREGA
# =========================================================================
def load_agenda():
    rows = read_csv("Cópia de ENTREGA TECNICA - AGENDA 2026.csv")
    out = []
    for r in rows:
        r = r + [""] * (15 - len(r))
        data = parse_date(r[0])
        chassi = clean(r[4])
        if not data or not chassi:
            continue  # linhas de evento interno sem chassi (reuniao, medico etc.) fora do escopo do MVP
        hora_raw = clean(r[3])
        vendedor_id = get_vendedor_id(r[7])
        lavado = upper_clean(r[8]) == "LAVADO"
        aces_raw = upper_clean(r[9])
        acessorios = aces_raw == "SIM"
        entregador = clean(r[10])
        modalidade = clean(r[11])
        status_agend = clean(r[13])
        obs_pos = clean(r[14])
        out.append({
            "id": uid("age", chassi, data, len(out)),
            "chassi": chassi,
            "data": data,
            "horaRaw": hora_raw,
            "horaNormalizada": hora_raw if hora_raw and re.match(r"^\d{1,2}:\d{2}$", hora_raw) else None,
            "vendedorId": vendedor_id,
            "entregador": entregador,
            "modalidade": modalidade,
            "lavado": lavado,
            "acessorios": acessorios,
            "statusAgendamento": status_agend,
            "obsPosEntrega": obs_pos,
        })
    return out

# =========================================================================
# 5) AGENDA DE ACESSORIOS.csv
# CHASSI,VEICULO,CLIENTE,ORDEM,LOCAL,VENDEDOR,DT AGENDA,HR AGENDA,PRODUTIVO,
# VALOR,OS.,ACESSORIOS
# =========================================================================
def load_agenda_acessorios():
    rows = read_csv("Cópia de ENTREGA TECNICA - AGENDA DE ACESSÓRIOS.csv")
    out = []
    for r in rows:
        r = r + [""] * (12 - len(r))
        chassi = clean(r[0])
        if not chassi:
            continue
        local_id = get_local_id(r[4])
        vendedor_id = get_vendedor_id(r[5])
        dt_agenda = parse_date(r[6])
        hr_agenda = clean(r[7])
        produtivo = clean(r[8])
        valor = parse_valor(r[9])
        os_ = clean(r[10])
        descricao = clean(r[11])
        out.append({
            "id": uid("aac", chassi, r[3], len(out)),
            "chassi": chassi,
            "ordem": None,
            "localId": local_id,
            "vendedorId": vendedor_id,
            "dataAgenda": dt_agenda,
            "horaAgenda": hr_agenda,
            "produtivo": produtivo,
            "valor": valor,
            "os": os_,
            "descricaoAcessorios": descricao,
        })
    return out

# =========================================================================
# MAIN
# =========================================================================
def main():
    estoque, estoque_stats, pos_venda_from_estoque = load_estoque()
    showroom = load_estoque_showroom()
    programacao, pos_venda_from_programacao = load_programacao()
    entregues, pos_venda_from_entregues = load_entregues()

    # Cadeia de prioridade (o de baixo sobrescreve o de cima p/ o mesmo chassi):
    # ESTOQUE (base) < ESTOQUE_SHOWROOM (so enriquece chassi novos) <
    # PROGRAMACAO (Fase 2, mais especifico) < CAMINHOES_ENTREGUES (terminal).
    veiculos = dict(estoque)
    showroom_novos = 0
    for chassi, rec in showroom.items():
        if chassi not in veiculos:
            veiculos[chassi] = rec
            showroom_novos += 1
    programacao_overrides = 0
    for chassi, rec in programacao.items():
        if chassi in veiculos:
            programacao_overrides += 1
        veiculos[chassi] = rec
    overrides = 0
    for chassi, rec in entregues.items():
        if chassi in veiculos:
            overrides += 1
        veiculos[chassi] = rec

    movimentacao = load_movimentacao()
    agenda = load_agenda()
    agenda_acessorios = load_agenda_acessorios()

    pos_venda_events = pos_venda_from_estoque + pos_venda_from_programacao + pos_venda_from_entregues
    # pos-venda events apontando p/ chassi que nao existe na tabela veiculo
    # (ex.: só aparecia em CAMINHOES ENTREGUES como revisao) -> ignora se orfao
    pos_venda_events = [e for e in pos_venda_events if e["chassi"] in veiculos]

    # movimentacao/agenda apontando para chassi desconhecido -> mantemos
    # (schema real tem chassi que nao esta mais em estoque nem entregues,
    # ex. trocou de aba faz tempo). Nao filtramos para nao perder dado real.

    veiculos_list = list(veiculos.values())
    for v in veiculos_list:
        v.pop("_source", None)
        v.pop("_posVendaTipo", None)
        v.pop("_dtEnt", None)

    def ref_list(d):
        return [
            {"id": v["id"], "nome": v["nome"], "aliases": sorted(v["aliases"]), "ativo": True}
            for v in sorted(d.values(), key=lambda x: x["nome"])
        ]

    data = {
        "vendedores": ref_list(vendedores),
        "locais": ref_list(locais),
        "implementos": [{"id": v["id"], "nome": v["nome"], "ativo": True} for v in sorted(implementos.values(), key=lambda x: x["nome"])],
        "motivosReprovacao": [],
        "veiculos": veiculos_list,
        "movimentacoes": movimentacao,
        "agendaEntregas": agenda,
        "agendaAcessorios": agenda_acessorios,
        "posVendaEventos": pos_venda_events,
    }

    with open(os.path.join(OUT_DIR, "seed_data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # ---- report ----
    stage_counts = Counter(v["statusAtual"] for v in veiculos_list)
    tipo_venda_counts = Counter(v["tipoVenda"] for v in veiculos_list)
    flags = Counter()
    for v in veiculos_list:
        if v["avariado"]: flags["avariado"] += 1
        if v["pendenciaBateria"]: flags["bateria"] += 1
        if v["pendenciaOficina"]: flags["oficina"] += 1
        if v["nfCancelada"]: flags["nf_cancelada"] += 1
        if not v["pago"]: flags["nao_pago"] += 1
        if v["recallStatus"] == "tem": flags["recall_tem"] += 1

    with open(os.path.join(OUT_DIR, "report.txt"), "w", encoding="utf-8") as f:
        f.write(f"ESTOQUE.csv: {len(estoque)} veiculos unicos (status comercial: {dict(estoque_stats)})\n")
        f.write(f"ESTOQUE SHOWROOM.csv: {len(showroom)} linhas, {showroom_novos} chassi novos (nao vistos em ESTOQUE)\n")
        f.write(f"PROGRAMACAO.csv: {len(programacao)} veiculos unicos, {programacao_overrides} sobrescreveram ESTOQUE/SHOWROOM\n")
        f.write(f"CAMINHOES ENTREGUES.csv: {len(entregues)} veiculos unicos, {overrides} sobrescreveram os anteriores\n")
        f.write(f"Total de eventos pos-venda: {len(pos_venda_events)}\n")
        f.write(f"TOTAL veiculos consolidados: {len(veiculos_list)}\n\n")
        f.write("Distribuicao por estagio:\n")
        for s in [STAGE_01,STAGE_02,STAGE_03,STAGE_04,STAGE_05,STAGE_06,STAGE_07,STAGE_08,STAGE_09,STAGE_10]:
            f.write(f"  {s}: {stage_counts.get(s,0)}\n")
        f.write(f"\nTipo de venda: {dict(tipo_venda_counts)}\n")
        f.write(f"Flags: {dict(flags)}\n")
        f.write(f"\nVendedores unicos (com merge de duplicatas): {len(vendedores)}\n")
        for nome, v in sorted(vendedores.items()):
            alias = f"  (aliases: {sorted(v['aliases'])})" if v['aliases'] else ""
            f.write(f"  - {nome}{alias}\n")
        f.write(f"\nLocais unicos: {len(locais)}\n")
        for nome, v in sorted(locais.items()):
            alias = f"  (aliases: {sorted(v['aliases'])})" if v['aliases'] else ""
            f.write(f"  - {nome}{alias}\n")
        f.write(f"\nImplementos unicos: {len(implementos)}\n")
        for nome in sorted(implementos):
            f.write(f"  - {nome}\n")
        f.write(f"\nMovimentacao: {len(movimentacao)} linhas\n")
        f.write(f"Agenda de entrega: {len(agenda)} linhas (linhas sem chassi/data descartadas)\n")
        f.write(f"Agenda de acessorios: {len(agenda_acessorios)} linhas\n")

        f.write(f"\n--- Valores REJEITADOS (linha com dado provavelmente na coluna errada na planilha original, nao viraram referencia) ---\n")
        f.write(f"Vendedor rejeitados ({sum(rejected_vendedores.values())} ocorrencias, {len(rejected_vendedores)} valores unicos):\n")
        for val, cnt in rejected_vendedores.most_common(40):
            f.write(f"  - {val!r}: {cnt}x\n")
        f.write(f"Local rejeitados ({sum(rejected_locais.values())} ocorrencias, {len(rejected_locais)} valores unicos):\n")
        for val, cnt in rejected_locais.most_common(40):
            f.write(f"  - {val!r}: {cnt}x\n")
        f.write(f"Implemento rejeitados ({sum(rejected_implementos.values())} ocorrencias, {len(rejected_implementos)} valores unicos):\n")
        for val, cnt in rejected_implementos.most_common(40):
            f.write(f"  - {val!r}: {cnt}x\n")

    generate_sql(data)

    print("OK ->", OUT_DIR)
    print(open(os.path.join(OUT_DIR, "report.txt"), encoding="utf-8").read())

# -----------------------------------------------------------------------
# db/seed.sql real, no mesmo shape do schema.sql ja fechado
# -----------------------------------------------------------------------
def sql_str(v):
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"

def sql_bool(v):
    return "true" if v else "false"

def sql_num(v):
    return "null" if v is None else str(v)

def generate_sql(data):
    lines = []
    lines.append("-- =============================================================================")
    lines.append("-- Torre de Controle Belcar -- SEED REAL, gerado a partir dos CSVs exportados")
    lines.append("-- da planilha oficial (ETL em scratchpad/etl.py). Substitui o seed sintetico.")
    lines.append("-- Rodar depois de db/schema.sql.")
    lines.append("-- =============================================================================\n")

    lines.append("insert into vendedor (id, nome, aliases) values")
    vrows = []
    for v in data["vendedores"]:
        aliases_sql = "ARRAY[" + ",".join(sql_str(a) for a in v["aliases"]) + "]::text[]" if v["aliases"] else "'{}'"
        vrows.append(f"  ({sql_str(v['id'])}, {sql_str(v['nome'])}, {aliases_sql})")
    lines.append(",\n".join(vrows) + ";\n")

    lines.append("insert into local (id, nome, aliases) values")
    lrows = []
    for l in data["locais"]:
        aliases_sql = "ARRAY[" + ",".join(sql_str(a) for a in l["aliases"]) + "]::text[]" if l["aliases"] else "'{}'"
        lrows.append(f"  ({sql_str(l['id'])}, {sql_str(l['nome'])}, {aliases_sql})")
    lines.append(",\n".join(lrows) + ";\n")

    lines.append("insert into implemento (id, nome) values")
    irows = [f"  ({sql_str(i['id'])}, {sql_str(i['nome'])})" for i in data["implementos"]]
    lines.append(",\n".join(irows) + ";\n")

    lines.append("insert into veiculo (")
    lines.append("  chassi, veiculo, cor, cliente, status_atual, responsavel_id, local_atual_id,")
    lines.append("  implemento_id, vendedor_id, tipo_venda, nf, data_faturamento,")
    lines.append("  data_faturamento_fabrica, pago, recall_status, avariado, pendencia_bateria,")
    lines.append("  pendencia_oficina, nf_cancelada, local_entrega_especial, valor, observacoes")
    lines.append(") values")
    vehrows = []
    for v in data["veiculos"]:
        vehrows.append("  (" + ", ".join([
            sql_str(v["chassi"]), sql_str(v["veiculo"]), sql_str(v["cor"]), sql_str(v["cliente"]),
            sql_str(v["statusAtual"]) + "::status_pipeline", sql_str(v["responsavelId"]), sql_str(v["localAtualId"]),
            sql_str(v["implementoId"]), sql_str(v["vendedorId"]), sql_str(v["tipoVenda"]) + "::tipo_venda",
            sql_str(v["nf"]), sql_str(v["dataFaturamento"]), sql_str(v["dataFaturamentoFabrica"]),
            sql_bool(v["pago"]), sql_str(v["recallStatus"]) + "::recall_status", sql_bool(v["avariado"]),
            sql_bool(v["pendenciaBateria"]), sql_str(v["pendenciaOficina"]), sql_bool(v["nfCancelada"]),
            sql_str(v["localEntregaEspecial"]), sql_num(v["valor"]), sql_str(v["observacoes"]),
        ]) + ")")
    # chassi eh PK: nao pode duplicar. divide em chunks pra facilitar leitura/diff
    CHUNK = 200
    with open(os.path.join(OUT_DIR, "seed_real.sql"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
        f.write("\n")
        for i in range(0, len(vehrows), CHUNK):
            chunk = vehrows[i:i+CHUNK]
            f.write("insert into veiculo (\n")
            f.write("  chassi, veiculo, cor, cliente, status_atual, responsavel_id, local_atual_id,\n")
            f.write("  implemento_id, vendedor_id, tipo_venda, nf, data_faturamento,\n")
            f.write("  data_faturamento_fabrica, pago, recall_status, avariado, pendencia_bateria,\n")
            f.write("  pendencia_oficina, nf_cancelada, local_entrega_especial, valor, observacoes\n")
            f.write(") values\n")
            f.write(",\n".join(chunk))
            f.write(";\n\n")

        f.write("-- historico inicial (migracao) -- uma linha de criacao por veiculo, R4\n")
        f.write("insert into status_historico (chassi, status_anterior, status_novo, responsavel_id, motivo_texto)\n")
        f.write("select chassi, null, status_atual, responsavel_id, 'Importado da planilha real Belcar (ETL 2026-07-01)'\n")
        f.write("from veiculo;\n\n")

        if data["movimentacoes"]:
            f.write("insert into movimentacao (id, chassi, prioridade, origem_local_id, destino_local_id, motorista, data_solicitacao, data_retirada, data_chegada, observacoes) values\n")
            mrows = []
            for m in data["movimentacoes"]:
                mrows.append("  (" + ", ".join([
                    sql_str(m["id"]), sql_str(m["chassi"]), sql_str(m["prioridade"]) + "::prioridade_movimentacao",
                    sql_str(m["origemLocalId"]), sql_str(m["destinoLocalId"]), sql_str(m["motorista"]),
                    sql_str(m["dataSolicitacao"]), sql_str(m["dataRetirada"]), sql_str(m["dataChegada"]),
                    sql_str(m["observacoes"]),
                ]) + ")")
            for i in range(0, len(mrows), CHUNK):
                f.write("insert into movimentacao (id, chassi, prioridade, origem_local_id, destino_local_id, motorista, data_solicitacao, data_retirada, data_chegada, observacoes) values\n")
                f.write(",\n".join(mrows[i:i+CHUNK]))
                f.write(";\n\n")

        if data["agendaEntregas"]:
            arows = []
            for a in data["agendaEntregas"]:
                arows.append("  (" + ", ".join([
                    sql_str(a["id"]), sql_str(a["chassi"]), sql_str(a["data"]), sql_str(a["horaRaw"]),
                    sql_str(a["horaNormalizada"]), sql_str(a["vendedorId"]), sql_str(a["entregador"]),
                    sql_str(a["modalidade"]), sql_bool(a["lavado"]), sql_bool(a["acessorios"]),
                    sql_str(a["statusAgendamento"]), sql_str(a["obsPosEntrega"]),
                ]) + ")")
            for i in range(0, len(arows), CHUNK):
                f.write("insert into agenda_entrega (id, chassi, data, hora_raw, hora_normalizada, vendedor_id, entregador, modalidade, lavado, acessorios, status_agendamento, obs_pos_entrega) values\n")
                f.write(",\n".join(arows[i:i+CHUNK]))
                f.write(";\n\n")

        if data["agendaAcessorios"]:
            aarows = []
            for a in data["agendaAcessorios"]:
                aarows.append("  (" + ", ".join([
                    sql_str(a["id"]), sql_str(a["chassi"]), sql_num(a["ordem"]), sql_str(a["localId"]),
                    sql_str(a["vendedorId"]), sql_str(a["dataAgenda"]), sql_str(a["horaAgenda"]),
                    sql_str(a["produtivo"]), sql_num(a["valor"]), sql_str(a["os"]), sql_str(a["descricaoAcessorios"]),
                ]) + ")")
            for i in range(0, len(aarows), CHUNK):
                f.write("insert into agenda_acessorios (id, chassi, ordem, local_id, vendedor_id, data_agenda, hora_agenda, produtivo, valor, os, descricao_acessorios) values\n")
                f.write(",\n".join(aarows[i:i+CHUNK]))
                f.write(";\n\n")

        if data["posVendaEventos"]:
            pvrows = []
            for p in data["posVendaEventos"]:
                pvrows.append("  (" + ", ".join([
                    sql_str(p["id"]), sql_str(p["chassi"]),
                    sql_str(p["tipo"]) + "::tipo_pos_venda", sql_str(p["dataEvento"]), sql_str(p["status"]),
                ]) + ")")
            for i in range(0, len(pvrows), CHUNK):
                f.write("insert into pos_venda_evento (id, chassi, tipo, data_evento, status) values\n")
                f.write(",\n".join(pvrows[i:i+CHUNK]))
                f.write(";\n\n")


if __name__ == "__main__":
    main()

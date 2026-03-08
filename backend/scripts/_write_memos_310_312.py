"""Write detailed Spanish investigation memos for GT cases 310-312.

Cases:
  310 - Landsteiner Scientific (VID=5724) — ARV monopoly IMSS/CENSIDA
  311 - Alvartis Pharma (VID=190131) — anomalous growth DA pharma
  312 - Medi Access Seguros (VID=106586) — ISES health insurance intermediary

Run from backend/ directory:
    python -m scripts._write_memos_310_312
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import date

DB = "RUBLI_NORMALIZED.db"

MEMOS = {
    310: {
        "vendor_id": 5724,
        "vendor_name": "LANDSTEINER SCIENTIFIC S.A. DE C.V.",
        "memo": """
MEMORANDO DE INVESTIGACIÓN — CASO GT-310
Fecha: 2026-03-08 | Generado por: ARIA v2.0 | Revisión Humana Pendiente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUJETO: LANDSTEINER SCIENTIFIC S.A. DE C.V. (VID=5724)
TIPO DE CASO: Monopolio Concentrado — Distribuidor ARV/Diagnóstico
MONTO TOTAL: $6,660,000,000 MXN (286 contratos, 2002-2025)
NIVEL DE RIESGO: CRÍTICO (risk_score=0.979)
CONFIANZA GT: MEDIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMEN EJECUTIVO

Landsteiner Scientific S.A. de C.V. es uno de los principales proveedores de
medicamentos antirretrovirales (ARV) genéricos al sector público mexicano,
concentrando 6.66 mil millones de pesos en contratos entre 2002 y 2025. El
proveedor opera sin RFC registrado en COMPRANET, lo que imposibilita la
verificación fiscal cruzada. Su patrón de concentración institucional extrema
—80 contratos con IMSS (4.27B MXN) y 3 contratos con CENSIDA (1.25B MXN)—
junto con adjudicaciones directas de alto valor en una categoría de medicamentos
controlados, constituye un perfil de riesgo elevado.

ANÁLISIS DE CONTRATOS

Distribución institucional (top 5):
  • IMSS: 80 contratos | $4,271,330,059 MXN | 64.1% del total
  • CENSIDA: 3 contratos | $1,245,025,000 MXN | 18.7% del total
  • ISSSTE: 20 contratos | $447,216,336 MXN | 6.7% del total
  • IMSS-Bienestar: 25 contratos | $307,656,747 MXN | 4.6% del total
  • INSABI: 8 contratos | $272,263,868 MXN | 4.1% del total

Evolución temporal relevante:
  • 2002-2008: Contratos pequeños (<$145M MXN acumulados) — período de entrada
  • 2011-2012: Actividad mínima
  • 2019: Explosión repentina — 14 contratos, $951M MXN (1er año de escala mayor)
  • 2020: 60 contratos, $1,551M MXN — pico COVID/ARV (36.7% DA)
  • 2025: 92 contratos, $3,531M MXN — máximo histórico (38% DA)

Producto principal identificado: Efavirenz 600mg/Emtricitabina 200mg/Tenofovir
Disoproxil 300.6mg (TDF/FTC/EFV) — combinación ARV para VIH/SIDA.
El contrato CENSIDA 2019 ($800M DA) y 2020 ($434M DA) corresponden a esta clave.

ANÁLISIS DE RIESGO ESPECÍFICO

1. AUSENCIA DE RFC (CRÍTICO): Sin RFC no es posible:
   a) Verificar registro ante SAT ni cumplimiento fiscal
   b) Cruzar con lista EFOS/EDOS del SAT (empresas fantasma)
   c) Identificar propietarios reales (personas físicas vinculadas)
   d) Verificar si el RFC existe bajo otra razón social

2. CONCENTRACIÓN EN MEDICAMENTOS CONTROLADOS ARV:
   Los ARV son medicamentos de alta especialidad para VIH/SIDA. En México, la
   distribución es gestionada por CENSIDA y COFEPRIS. La compra directa de $800M
   MXN en un solo contrato DA a un proveedor sin RFC es irregularidad de primer
   orden. Los ARV genéricos tipo TDF/FTC/EFV NO están protegidos por patente
   activa de Gilead en México desde aproximadamente 2017-2018 (las patentes
   mexicanas de tenofovir disoproxil vencieron); por tanto, la adjudicación
   directa por exclusividad de patente NO está justificada.

3. PATRÓN DE ESCALAMIENTO ABRUPTO 2019-2025:
   El salto de $9.5M (2008) a $951M (2019) en una sola empresa sin RFC sugiere
   dos hipótesis: (a) empresa intermediaria que entra al mercado ARV aprovechando
   cambio de administración (AMLO 2018), o (b) empresa legítima con capacidad
   preexistente que no había registrado RFC en COMPRANET. La hipótesis (a) es
   más consistente con la ausencia de RFC y el monto de los primeros contratos.

4. TASA DA = 25.7%: En categoría de medicamentos de alto valor, 25.7% de
   adjudicación directa es elevada. Las justificaciones típicas LAASSP Art. 41
   para medicamentos son: exclusividad de patente, emergencia sanitaria (COVID-2020
   podría justificar parte de 2020), o proveedor único. Sin RFC no se puede
   verificar cuál aplica.

SEÑALES DE ALERTA SECUNDARIAS
  • Vendor concentration z-score elevado (risk_score=0.979)
  • price_volatility alta: contratos van de $14K (2008) a $1.97B (2025)
  • win_rate anómalo para proveedor sin RFC en mercado ARV
  • Desaparece de COMPRANET 2009-2018 (9 años sin contratos)

CONTEXTO SECTORIAL
El mercado ARV genérico mexicano ha sido objeto de investigaciones de la COFECE
por posibles prácticas monopólicas. La entrada de nuevos distribuidores sin
antecedentes fiscales claros en 2019 coincide con el cambio de política de
abastecimiento del gobierno federal (IMSS Bienestar, INSABI).

ACCIONES RECOMENDADAS
  1. [URGENTE] Solicitar a COMPRANET el RFC real del proveedor vía transparencia
  2. Cruzar nombre "Landsteiner Scientific" con SAT (búsqueda RFC por nombre)
  3. Verificar en COFEPRIS: ¿tiene registro sanitario como fabricante o distribuidor?
  4. Solicitar ASF Cuenta Pública 2019-2022 auditorías CENSIDA/IMSS medicamentos ARV
  5. Comparar precio por unidad vs contratos de otros proveedores ARV en el mismo período
  6. Investigar prensa especializada: ¿aparece en escándalos CENSIDA/UNOPS?

VEREDICTO PROVISIONAL
Alta sospecha de irregularidad. El perfil (sin RFC + ARV genérico + DA masiva +
escalamiento abrupto 2019) NO corresponde a fabricante de patente. Patrón más
consistente con distribuidor intermediario beneficiado por cambio de administración.
Confianza media hasta verificar RFC y precios unitarios.

[FIN MEMO GT-310 | ARIA v2.0 | 2026-03-08]
""",
    },
    311: {
        "vendor_id": 190131,
        "vendor_name": "ALVARTIS PHARMA SA DE CV",
        "memo": """
MEMORANDO DE INVESTIGACIÓN — CASO GT-311
Fecha: 2026-03-08 | Generado por: ARIA v2.0 | Revisión Humana Pendiente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUJETO: ALVARTIS PHARMA SA DE CV (VID=190131)
TIPO DE CASO: Monopolio Concentrado — Farmacéutica de Crecimiento Anómalo
MONTO TOTAL: $4,620,000,000 MXN (322 contratos, 2016-2025)
NIVEL DE RIESGO: CRÍTICO (risk_score=0.966)
CONFIANZA GT: MEDIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMEN EJECUTIVO

Alvartis Pharma S.A. de C.V. es un caso clásico de crecimiento exponencial
anómalo en el mercado de medicamentos del sector público. Inició con contratos
insignificantes en 2016-2018 ($1.6M MXN acumulados) y en 2025 factura $2.76B
MXN en un solo año. Opera sin RFC registrado en COMPRANET. La empresa abastece
simultáneamente a IMSS, ISSSTE, SSA e INSABI con medicamentos genéricos, con
una tasa de adjudicación directa del 41.3%. Este perfil —empresa nueva, sin RFC,
crecimiento >4,000x en 9 años, alta DA multiinstitucional— es el más típico
de empresa intermediaria creada para capturar contratos gubernamentales.

ANÁLISIS DE CONTRATOS

Trayectoria de crecimiento (monto anual):
  • 2016: $620,732 MXN (3 contratos, DA=67%) — entrada simbólica
  • 2017: $528,648 MXN (3 contratos, DA=67%) — mínima
  • 2018: $2,439,375 MXN (9 contratos, DA=89%) — todavía insignificante
  • 2019: $292,346,738 MXN (22 contratos, DA=18%) — PRIMER SALTO MASIVO (+552x)
  • 2020: $902,316,796 MXN (66 contratos, DA=41%) — incluye contratos COVID
  • 2021: $124,757,883 MXN (57 contratos, DA=40%) — ligera baja
  • 2022: $458,961,217 MXN (40 contratos, DA=18%)
  • 2023: $32,315,823 MXN (8 contratos, DA=75%) — caída abrupta
  • 2024: $12,889,119 MXN (8 contratos, DA=100%) — mínimo otra vez
  • 2025: $2,760,318,004 MXN (103 contratos, DA=44%) — SEGUNDO SALTO MASIVO

Distribución institucional (top 5):
  • IMSS: 42 contratos | $3,159,594,124 MXN | 68.4% del total
  • IMSS-Bienestar: 36 contratos | $522,158,203 MXN | 11.3%
  • ISSSTE: 24 contratos | $277,168,301 MXN | 6.0%
  • SSA: 10 contratos | $269,151,695 MXN | 5.8%
  • INSABI: 22 contratos | $240,565,403 MXN | 5.2%

ANÁLISIS DE RIESGO ESPECÍFICO

1. PATRÓN DE DOS PICOS ANÓMALOS (2019 y 2025):
   El patrón de dos saltos masivos separados por años de baja actividad es
   altamente inusual para un proveedor farmacéutico legítimo. Los proveedores
   establecidos mantienen contratos continuos. Este patrón sugiere: empresa
   utilizada episódicamente para contratos específicos o empresa que gana
   licitaciones consolidadas en años alternos. El salto 2019 coincide con el
   inicio del gobierno AMLO (cambio de proveedores en IMSS/INSABI). El salto
   2025 coincide con el primer año del gobierno Sheinbaum.

2. AUSENCIA TOTAL DE RFC:
   Con 322 contratos y $4.62B MXN en 9 años, la ausencia de RFC en COMPRANET
   es inexplicable para una empresa de este tamaño. Si paga impuestos (SAT)
   como S.A. de C.V., tiene RFC obligatoriamente. La ausencia sugiere: (a) dato
   omitido deliberadamente en COMPRANET, o (b) empresa que no presenta
   declaraciones fiscales (evasión). En ambos casos, es señal de alerta crítica.

3. DA = 41.3% EN MEDICAMENTOS GENÉRICOS:
   Los medicamentos genéricos en México son licitados competitivamente por
   definición (LAASSP y Ley de Compras del IMSS). Una DA rate del 41.3% en
   esta categoría requiere justificación legal individual para cada contrato.
   La justificación típica en COVID-2020 aplica solo a ~$200M del total;
   el restante $4.4B bajo DA es anómalo.

4. SIMULTANEIDAD MULTIINSTITUCIONAL:
   Abastecer simultáneamente a IMSS, IMSS-Bienestar, ISSSTE, SSA e INSABI
   en el mismo año (2025: 103 contratos) requiere infraestructura de almacenaje,
   distribución y cadena de frío de escala nacional. Sin RFC ni evidencia de
   instalaciones registradas, esta capacidad operativa es cuestionable.

5. MEDICAMENTOS COVID-19 ($201M DA, 2020):
   La Secretaría de Salud adjudicó $201M MXN directamente a Alvartis Pharma
   para "insumos COVID-19 y medicamentos". Las compras COVID-19 en México fueron
   objeto de múltiples investigaciones (ASF, periodismo de datos). Este contrato
   específico debe cruzarse con los listados de la ASF.

SEÑALES DE ALERTA SECUNDARIAS
  • Caída a $12M (2024) seguida de explosión a $2.76B (2025): patrón no lineal
  • price_volatility extrema entre contratos ($620K a $1.37B en el mismo período)
  • win_rate anómalo: primera empresa de tamaño relevante sin RFC en su categoría
  • Nombre "Alvartis": posible juego con "Novartis" (fabricante suizo de referencia)

CONTEXTO SECTORIAL
Las adquisiciones consolidadas de medicamentos del IMSS 2019-2025 han sido
objeto de controversia pública. La inclusión de Alvartis como proveedor
frecuente de IMSS, ISSSTE e INSABI sin RFC públicamente verificable es
inconsistente con los marcos de transparencia LAASSP actuales.

ACCIONES RECOMENDADAS
  1. [URGENTE] Búsqueda de RFC por nombre en SAT (API COMPRANET o solicitud)
  2. Verificar fecha de constitución en RPC/SIGER: ¿existe antes de 2016?
  3. Cruzar con lista EFOS/EDOS SAT (por nombre, sin RFC directo)
  4. Solicitar precios unitarios de medicamentos específicos (e.g. metformina,
     insulina, ibuprofeno) y comparar vs contratos IMSS de otros proveedores
  5. Investigar si "Alvartis Pharma" tiene registro sanitario COFEPRIS como
     fabricante, importador o distribuidor
  6. Cruzar contratos COVID-2020 ($201M) con informes ASF 2020-2021 SSA

VEREDICTO PROVISIONAL
Perfil de muy alto riesgo. El crecimiento 4,000x sin RFC, con dos picos masivos
en años de cambio de administración, abasteciendo 5 instituciones simultáneamente,
es el patrón más consistente con empresa intermediaria de nueva creación vinculada
a funcionarios públicos. Confianza media por falta de RFC que permita confirmar
identidad real del proveedor.

[FIN MEMO GT-311 | ARIA v2.0 | 2026-03-08]
""",
    },
    312: {
        "vendor_id": 106586,
        "vendor_name": "MEDI ACCESS SEGUROS DE SALUD, S.A. DE C.V.",
        "memo": """
MEMORANDO DE INVESTIGACIÓN — CASO GT-312
Fecha: 2026-03-08 | Generado por: ARIA v2.0 | Revisión Humana Pendiente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUJETO: MEDI ACCESS SEGUROS DE SALUD, S.A. DE C.V. (VID=106586)
TIPO DE CASO: Intermediario de Uso Concentrado — ISES Seguro Médico
MONTO TOTAL: $3,110,000,000 MXN (14 contratos, 2013-2018)
NIVEL DE RIESGO: ALTO (risk_score=0.927)
CONFIANZA GT: BAJA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMEN EJECUTIVO

Medi Access Seguros de Salud S.A. de C.V. operó como Institución de Seguros
Especializada en Salud (ISES) para entidades financieras del gobierno federal
entre 2013 y 2018, acumulando $3.11B MXN en 14 contratos. El promedio por
contrato es $222M MXN, lo que refleja el tamaño típico de contratos de seguro
médico institucional. La confianza GT es BAJA porque el modelo ISES es una
figura jurídica reconocida por la CNSF —no es prima facie sospechosa. Sin
embargo, la ausencia de RFC en COMPRANET y la concentración en instituciones
financieras públicas de segundo nivel justifican su inclusión para investigación
focalizada en márgenes de intermediación y solvencia.

ANÁLISIS DE CONTRATOS

Distribución por institución contratante:
  • NAFINSA (Nacional Financiera): 1 contrato | $968,366,974 MXN | 31.1%
    Título: "Atención Médica Integral para el Personal de NAFINSA"
  • SAE (Servicio de Administración y Enajenación de Bienes): 1 contrato |
    $923,445,236 MXN | 29.7%
    Título: "Administración de Servicios Integrales en el Ramo de Salud"
  • BANCOMEXT: 1 contrato | $479,722,376 MXN | 15.4%
    Título: "Servicios de Administración y Otorgamiento de Atención Médica Integral
    a Nivel Nacional para BANCOMEXT, Honorarios Médicos Pensionados y Derechohabientes"
  • Lotería Nacional: 4 contratos | $591,233,134 MXN | 19.0%
    Incluye servicios médicos integrales y de hospitalización (2013-2016)
  • BANSEFI: 1 contrato | $73,699,394 MXN | 2.4%
    Título: "Servicio de Administración y Uso de Servicios Médicos a través de Red"

Evolución temporal:
  • 2013: 3 contratos, $170,543,240 MXN (Lotería, Pronósticos)
  • 2015: 2 contratos, $269,620,759 MXN
  • 2016: 1 contrato, $216,162,375 MXN
  • 2017: 4 contratos, $484,577,657 MXN
  • 2018: 4 contratos, $1,968,219,384 MXN — PICO (NAFINSA + SAE dominan)

ANÁLISIS DE RIESGO ESPECÍFICO

1. NATURALEZA ISES — CONTEXTO LEGAL IMPORTANTE:
   Las ISES (Instituciones de Seguros Especializadas en Salud) son figuras
   creadas por la Ley de Instituciones de Seguros y de Fianzas (LISF) y
   reguladas por la CNSF (Comisión Nacional de Seguros y Fianzas). Contrato
   LAASSP Art. 26 les permite operar como prestadores de servicios médicos
   integrales para trabajadores de entidades gubernamentales que no pertenecen
   al régimen IMSS/ISSSTE general (banca de desarrollo, organismos especiales).

2. AUSENCIA DE RFC (MODERADA EN CONTEXTO ISES):
   Aunque preocupante, la ausencia de RFC en COMPRANET puede reflejar omisión
   administrativa en contratos anteriores a 2018 (cuando la cobertura RFC era
   30.3%). Sin embargo, una aseguradora regulada por CNSF OBLIGATORIAMENTE
   tiene RFC. La ausencia indica que no fue capturado en COMPRANET, no que
   no exista. Verificable en registro CNSF.

3. CONCENTRACIÓN EN INSTITUCIONES FINANCIERAS PÚBLICAS:
   NAFINSA, BANCOMEXT, BANSEFI y SAE son entidades financieras del gobierno
   que tienen mayor autonomía en sus adquisiciones y menor escrutinio
   mediático que las secretarías de estado. El patrón de ISES operando
   exclusivamente con estas entidades (no con SSA, IMSS o ISSSTE) sugiere
   especialización en un nicho con menos competencia y control.

4. CONTRATO SAE 2018 ($923M): El SAE (Servicio de Administración y Enajenación
   de Bienes) administra activos en litigio del Estado. Un contrato de $923M
   para servicios médicos del personal SAE en un solo año (2018) es
   desproporcionado para una entidad con ~3,000 empleados. La prima per cápita
   implícita sería ~$307,800 MXN/empleado/año — very por encima de benchmarks
   de mercado para seguros de gastos médicos mayores corporativos (~$15K-$50K
   MXN/persona/año). Esta anomalía es la señal de alerta más concreta.

5. DA = 21.4%: En servicios de seguro médico, la adjudicación directa puede
   justificarse por continuidad de atención (cambiar aseguradora mid-year
   es disruptivo). Sin RFC, no se puede verificar si existen concursos previos.

RIESGO MODELO: POSIBLE FALSO POSITIVO PARCIAL
El modelo ARIA clasifica este caso como "single_use_intermediary" porque:
  - 14 contratos solo con instituciones financieras = patrón de nicho
  - Desaparece después de 2018 (posible fusión o cambio de nombre)
  - risk_score=0.927 por vendor_concentration y price_volatility
Sin embargo, el modelo ISES es legítimo. La "intermediación" es el servicio.
El riesgo real es de sobreprecio, no de empresa fantasma.

ACCIONES RECOMENDADAS
  1. [PRIORIDAD ALTA] Verificar en CNSF: ¿"Medi Access Seguros de Salud" tiene
     autorización ISES vigente? ¿Cuál es su RFC real?
  2. Solicitar el expediente del contrato SAE 2018 ($923M) vía transparencia:
     número de empleados asegurados y prima per cápita implícita
  3. Comparar prima per cápita vs contratos similares ISES de BANOBRAS, CONSAR
     o Banco de México en el mismo período
  4. Verificar si la empresa fue absorbida, liquidada o transformó razón social
     después de 2018 (motivo de desaparición del registro)
  5. Cruzar con ASF si alguna de estas instituciones fue auditada 2013-2018

VEREDICTO PROVISIONAL
Riesgo moderado con señal de alerta específica en el contrato SAE 2018. La
figura ISES es legítima; el riesgo concreto es de sobreprecio en el contrato SAE.
Confianza GT BAJA: investigar antes de incluir en modelo de entrenamiento.
NO es caso de empresa fantasma ni intermediario ilícito per se.

[FIN MEMO GT-312 | ARIA v2.0 | 2026-03-08]
""",
    },
}


def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    for case_db_id, data in MEMOS.items():
        memo_text = data["memo"].strip()

        # Append memo to existing notes
        existing = conn.execute(
            "SELECT notes FROM ground_truth_cases WHERE id=?", (case_db_id,)
        ).fetchone()
        if existing is None:
            print(f"WARNING: Case {case_db_id} not found in DB — skipping")
            continue

        existing_notes = existing[0] or ""
        separator = "\n\n" if existing_notes else ""
        updated_notes = existing_notes + separator + memo_text

        cur.execute(
            "UPDATE ground_truth_cases SET notes=? WHERE id=?",
            (updated_notes, case_db_id),
        )
        rows = cur.rowcount
        vendor_name = data["vendor_name"]
        print(f"GT-{case_db_id} ({vendor_name}): memo written ({len(memo_text)} chars, rows_updated={rows})")

    conn.commit()
    print(f"\nAll memos written. Today: {date.today()}")
    conn.close()


if __name__ == "__main__":
    write_memos()

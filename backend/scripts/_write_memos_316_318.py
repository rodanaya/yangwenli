"""Write Spanish investigation memos for GT cases 316-318 into the notes column."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import date

DB = "RUBLI_NORMALIZED.db"

MEMOS = {
    316: """MEMO DE INVESTIGACION — Caso 316
Fecha: {today}
Proveedor: FARMACOS ESPECILIAZDOS S.A. DE C.V. (VID=1545)
Clasificacion: Monopolio Concentrado | Confianza: MEDIA
Valor total: 7.04 B MXN | Contratos: 566 | Periodo: 2002-2010
Instituciones principales: ISSSTE (3.25B), IMSS (1.28B), SSA antirretrovirales (1.06B), PEMEX (934M)

RESUMEN EJECUTIVO
Esta empresa opero como proveedor centralizado de medicamentos para las principales instituciones de salud
del gobierno federal durante 2002-2010. Su desaparicion abrupta del registro COMPRANET a partir de 2010,
combinada con la falta de RFC, genera interrogantes sobre su naturaleza juridica real.

HALLAZGOS PRINCIPALES
1. CONCENTRACION INSTITUCIONAL: Sirve a 5 instituciones distintas (43 claves de unidad compradora),
   lo que sugiere amplia capacidad logistica o relaciones institucionales privilegiadas.
2. LICITACION UNICA: 35 contratos (6.2%) con licitacion publica pero un solo postor, distribuidos
   en todos los anios 2002-2010. Patrón consistente de procedimientos sin competencia real.
3. ISSSTE MEGA-CONTRATO: El contrato de 3.22B MXN en 2009 para administracion integral de la cadena
   de suministro del ISSSTE 2009-2012 es el mayor valor individual. Esta modalidad de outsourcing total
   fue controversial en el periodo.
4. SIN RFC: Imposible verificar existencia en SAT, historial fiscal, o si la empresa fue constituida
   legalmente. El nombre con la errata "ESPECILIAZDOS" sugiere precariedad documental.
5. DESAPARICION EN 2010: Coincide con inicio de reformas de adquisiciones publicas y mayor escrutinio
   de intermediarios farmaceuticos post-IMSS. Posible restructuracion bajo otro nombre.

CONTEXTO SECTORIAL
En 2002-2010, el sector salud mexicano fue objeto de multiples controversias por la intermediacion
farmaceutica (distribuidoras que ganan contratos publicos sin ser fabricantes, con margenes opacos).
La ASF documento irregularidades en contratos ISSSTE de medicamentos en las Cuentas Publicas 2007-2010.

LINEAS DE INVESTIGACION PRIORITARIAS
- Cruce con ASF Cuenta Publica 2002-2010 (Ramo 50: ISSSTE, Ramo 12: SSA)
- Solicitar via Transparencia los expedientes de licitacion de los 35 contratos de postor unico
- Verificar si existe RFC real en SAT y si la empresa presento declaraciones fiscales 2002-2010
- Buscar en RPPC (Registro Publico del Comercio Publico) la acta constitutiva
- Investigar si directivos o accionistas tienen vinculacion con funcionarios de ISSSTE/IMSS de la epoca

VEREDICTO PRELIMINAR
Confianza MEDIA en irregularidad. El patron es compatible con intermediario farmaceutico opaco
pero tambien con un distribuidor legitimo de especialidad mal documentado en el sistema COMPRANET
antiguo (Estructura A, baja calidad). Se requiere investigacion documental para confirmar.
[MEMO GENERADO ARIA: {today}]""",

    317: """MEMO DE INVESTIGACION — Caso 317
Fecha: {today}
Proveedor: ASESORIA MEDICA RADIOLOGICA Y FARMACEUTICA, SA DE CV (VID=594)
Clasificacion: Captura Institucional | Confianza: MEDIA
Valor total: 3.40 B MXN | Contratos: 30 | Periodo: 2002-2025
Instituciones principales: Loteria Nacional (1.42B), INDEP (1.03B), NAFIN (445M)

RESUMEN EJECUTIVO
Proveedor de servicios medicos integrales que en 23 anios ha mantenido una relacion cuasi-exclusiva
con tres organismos paraestatales de naturaleza no sanitaria (loteria, banca de desarrollo, gestion de bienes
confiscados), evitando las instituciones de salud convencionales con mayor escrutinio publico.

HALLAZGOS PRINCIPALES
1. NOMBRE ANOMALO: La combinacion "Radiologica Y Farmaceutica" en un prestador de servicios medicos
   integrales es atipica. Las empresas ISES/HMO legitimas no suelen incluir especialidades medicas
   en su razon social. Podria ser nombre heredado de actividad original distinta.
2. CAPTURA DE MERCADO EN TRES ORGANISMOS: Loteria Nacional, INDEP y NAFIN han contratado
   repetidamente con el mismo proveedor durante 2002-2025 sin diversificar, a pesar de que el
   mercado de servicios medicos subrogados tiene multiples competidores acreditados (MAPFRE Salud,
   Metlife, Christus Muguerza, etc.).
3. ESCALA CRECIENTE: Los contratos escalan de valores modestos pre-2018 a contratos anuales de
   250-750M MXN post-2018, incluyendo el de 752.8M MXN en 2025 con INDEP.
4. 8 CONTRATOS LICITACION UNICA (26.7%): Proporcion muy alta para un mercado donde existen
   multiples prestadores de servicios medicos subrogados.
5. SIN RFC: En 23 anios de contratos federales, nunca registraron RFC en COMPRANET.
6. PATRON POST-2018: La empresa se reactiva con contratos masivos precisamente cuando
   INDEP (antes SAE) cambia de administracion. Posible conexion politica.

CONTEXTO SECTORIAL
Los servicios medicos subrogados para empleados de paraestatales son un sector con escasa
transparencia. La SHCP y la SFP han documentado casos de sobreprecios en este segmento.
Las ISES y HMO que atienden a empleados de loteria/banca desarrollo no estan sujetas al
mismo nivel de auditoria que los contratos de IMSS/ISSSTE.

LINEAS DE INVESTIGACION PRIORITARIAS
- Verificar RFC real en SAT; si no existe, documentar como empresa fantasma potencial
- Solicitar via INAI los contratos de Loteria Nacional 2002-2025 con este proveedor
- Comparar precios per capita vs benchmarks CNSF para grupos de similar tamano
- Investigar vinculacion de directivos con funcionarios de Loteria Nacional/INDEP
- Revisar si la empresa tiene acreditacion de la CNSF como ISES o si opera sin regulacion

VEREDICTO PRELIMINAR
Confianza MEDIA en irregularidad. El patron de proveedor unico durante 23 anios,
con escalada de contratos post-2018, licitacion unica recurrente y sin RFC,
es consistente con captura institucional. No se descarta que sea un prestador
HMO/ISES legitimo con relacion de largo plazo; la ausencia de RFC es el factor
mas preocupante y debe resolverse antes de escalar la investigacion.
[MEMO GENERADO ARIA: {today}]""",

    318: """MEMO DE INVESTIGACION — Caso 318
Fecha: {today}
Proveedor: OCTAPHARMA, S. A. DE C. V. (VID=20073)
Clasificacion: Monopolio Concentrado / Posible Sobreprecios | Confianza: BAJA
Valor total: 4.00 B MXN | Contratos: 233 | Periodo: 2005-2025
Instituciones principales: IMSS (3.22B, 139 contratos), ISSSTE (333M), INSABI/IMSS Bienestar (290M)

RESUMEN EJECUTIVO
Filial mexicana de Octapharma AG (Suiza, fundada 1983), uno de los tres mayores fabricantes mundiales
de hemoderivados y proteinas plasmaticas. Provee al sector salud mexicano albumina humana,
factores de coagulacion (Factor VIII, Factor IX, Factor von Willebrand), inmunoglobulinas IV
y proteinas C-reactivas. Confianza BAJA en irregularidad: el modelo de negocio tiene justificacion
estructural (pocos fabricantes, productos biologicos de plasma de alta especialidad).

HALLAZGOS PRINCIPALES
1. AUSENCIA DE RFC EN 20 ANIOS: Octapharma AG tiene filial registrada en Mexico (podria tener RFC
   como persona moral con actividad empresarial). La ausencia de RFC en COMPRANET durante 2005-2025
   es anomala para una multinacional establecida, aunque comun en datos Estructura A/B/C.
2. ADJUDICACION DIRECTA 32.2%: 74 de 233 contratos son directos. Para hemoderivados biologicos,
   esto puede estar parcialmente justificado por:
   a) LAASSP Art. 41 fraccion V: producto exclusivo sin sustituto (Factor VIII plasmático vs recombinante)
   b) Urgencias hospitalarias
   c) Compras consolidadas IMSS que fracasan en licitacion
3. 10 CONTRATOS LICITACION UNICA: Mas preocupante que la DA. Sugiere que en licitaciones
   formales, ningun otro fabricante ofrece. Baxter/Shire, Grifols, CSL Behring y Kedrion tambien
   venden en Mexico; su ausencia en estas licitaciones requiere explicacion.
4. CONTRATOS GENERICOS "MEDICAMENTOS": La mayoria de contratos no especifica el producto exacto,
   lo que impide auditoria de precios unitarios vs. referencias internacionales (PAHO Strategic Fund).
5. MEGA-CONTRATO 2025: 1.15B MXN en compra consolidada con patente IMSS. Si el precio unitario
   supera en >30% el precio de referencia PAHO/OPS, configura sobrepreci potencial.
6. CONCENTRACION IMSS: 80.7% del valor en IMSS sugiere relacion comercial solida, no necesariamente
   irregulardad. El IMSS es el mayor comprador de hemoderivados en America Latina.

CONTEXTO SECTORIAL
El mercado de hemoderivados es un oligopolio global (5-6 fabricantes dominan el 90% del mercado).
Los precios de albumina y factor VIII fluctuan significativamente. Mexico históricamente paga
precios superiores al promedio PAHO para estos productos (documentado en auditorias OPS 2015-2020).
La falta de una planta de fraccionamiento de plasma nacional obliga a importacion total.

LINEAS DE INVESTIGACION PRIORITARIAS
- Comparar precios unitarios vs. Lista de Precios PAHO Strategic Fund para el mismo periodo
- Verificar si licitaciones con postor unico excluyen a competidores por especificaciones tecnicas
  escritas a medida de Octapharma (licitaciones dirigidas)
- Solicitar RFC al SAT para confirmar existencia como persona moral activa con obligaciones fiscales
- Revisar si la DA del 32.2% tiene soporte documental (justificaciones LAASSP Art. 41)
- Investigar si directivos locales de Octapharma aparecen en redes de conflicto de interes con
  funcionarios de adquisiciones del IMSS

VEREDICTO PRELIMINAR
Confianza BAJA en irregularidad. Octapharma es un proveedor legitimo de hemoderivados de
clase mundial. El riesgo real es de sobreprecios en contratos sin desglose de precio unitario
y de posibles licitaciones dirigidas en los 10 contratos de postor unico. Se recomienda:
1. Analisis de precios unitarios antes de escalar a investigacion formal
2. Si precios son comparables a PAHO, reclasificar como FALSO POSITIVO (similar a Gilead)
3. Si precios superan 30% referencia PAHO, escalar con confianza media-alta
[MEMO GENERADO ARIA: {today}]""",
}


def write_memos():
    conn = sqlite3.connect(DB)
    today = date.today().isoformat()

    for case_db_id, memo_template in MEMOS.items():
        memo = memo_template.format(today=today)
        # Append memo to existing notes
        existing = conn.execute(
            "SELECT notes FROM ground_truth_cases WHERE id=?", (case_db_id,)
        ).fetchone()
        if existing is None:
            print(f"WARNING: Case id={case_db_id} not found, skipping")
            continue
        existing_notes = existing[0] or ""
        separator = "\n\n---\n\n" if existing_notes else ""
        new_notes = existing_notes + separator + memo
        conn.execute(
            "UPDATE ground_truth_cases SET notes=? WHERE id=?",
            (new_notes, case_db_id)
        )
        case_name = conn.execute(
            "SELECT case_name FROM ground_truth_cases WHERE id=?", (case_db_id,)
        ).fetchone()[0]
        print(f"Memo written for case id={case_db_id}: {case_name[:60]}...")

    conn.commit()
    print("\nAll memos written successfully.")
    conn.close()


if __name__ == "__main__":
    write_memos()

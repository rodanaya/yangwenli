"""Write ARIA investigation memos for Cases 36-42 vendors."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
today = '2026-03-08T00:00:00'

memos = {
    # Case 36: GRUFESA
    29277: {
        'memo': """MEMO DE INVESTIGACIÓN ARIA — GRUFESA (Grupo Fármacos Especializados SA de CV)
RFC: GFE061004F65 | Vendor ID: 29277
Tipo: Oligopolio farmacéutico + Inhabilitación SFP
Confianza: MEDIA

RESUMEN EJECUTIVO
=================
GRUFESA fue el mayor proveedor farmacéutico del IMSS/ISSSTE durante 2012-2018, concentrando el 35.2% del mercado con contratos por 106,800 MXN. En 2019 fue vetado por el presidente López Obrador por presuntas prácticas monopólicas, inhabilitado 2 años por la SFP por declaración falsa en procedimiento licitatorio (afirmó que todos los medicamentos ofrecidos eran de fabricación mexicana cuando al menos uno era de origen extranjero), e investigado por COFECE por conductas monopólicas absolutas.

EVIDENCIA CLAVE
===============
• SFP: Inhabilitación 2 años por declaración falsa en licitación IMSS (medicamento extranjero presentado como nacional)
• COFECE: Investigación por monopolio iniciada 2019
• AMLO: Veto presidencial abril 2019 ("sospechoso de prácticas monopólicas")
• Mercado: 35.2% cuota IMSS/ISSSTE 2012-2018 | 106,800 MXN contratos del período
• Base de datos: 133,400 MXN | 6,360 contratos 2007-2020 | 79.1% adjudicación directa
• COFECE: Solicitud de amparo (obtuvo suspensión provisional)
• Risk score: 0.981 — DETECTADO (concentración extrema + tasa DA elevada)

PATRÓN DE RIESGO
================
Concentración monopolística combinada con tasa de adjudicación directa del 79.1% y declaración falsa documentada. El modelo v5.1 detecta correctamente este caso (score=0.981) dado el patrón dominante de concentración de vendor. La inhabilitación de la SFP es sanción administrativa confirmada.

FUENTES
=======
El Universal (2019-2020); Sin Embargo; Proceso; PODER Latam; Animal Político
SFP: Directorio de Sancionados (inhabilitación 2 años)
COFECE: Expediente de investigación por monopolio 2019

ACCIONES SUGERIDAS
==================
✓ Incorporado a Ground Truth (Caso 36 — GRUFESA_PHARMA_OLIGOPOLY_2012_2020)
→ Cross-referencia con expediente COFECE
→ Verificar si la inhabilitación SFP se extendió o hubo resolución definitiva COFECE""",
        'status': 'confirmed_corrupt'
    },
    # Case 37: Grupo Industrial Asad
    148733: {
        'memo': """MEMO DE INVESTIGACIÓN ARIA — Grupo Industrial Asad SA de CV
RFC: Sin RFC en BD | Vendor ID: 148733
Tipo: Fraude en contratos de uniformes/vestuario
Confianza: MEDIA

RESUMEN EJECUTIVO
=================
Grupo Industrial Asad SA de CV acumuló 4 contratos rescindidos en 4 meses y 20 días, todos relacionados con la adquisición consolidada de ropa, uniformes, calzado y equipo. La Secretaría Anticorrupción y Buen Gobierno (ex-SFP) lo sancionó en febrero 2026 con multa de 791,980 MXN e inhabilitación de 15 meses, publicada en el Diario Oficial de la Federación el 10 de febrero de 2026.

EVIDENCIA CLAVE
===============
• SFP/SABG: Inhabilitación 15 meses + multa 791,980 MXN (DOF 10 febrero 2026)
• 4 contratos rescindidos en 5 meses (incumplimiento sistemático)
• Clientes principales: ISSSTE e IMSS
• Base de datos: 905 MXN | 173 contratos 2015-2025 | 70.5% adjudicación directa
• Risk score: 0.128 — BAJA DETECCIÓN (punto ciego del modelo para casos de incumplimiento vs fraude mayor)
• Ahora bloqueado para nuevos contratos federales

PATRÓN DE RIESGO
================
Incumplimiento contractual sistemático en adquisiciones consolidadas de vestuario. El modelo no detecta eficazmente este patrón de rescisiones múltiples — requeriría datos de ejecución contractual (no disponibles en COMPRANET). Score de 0.128 ilustra limitación documentada: la corrupción en la fase de ejecución es invisible al modelo de adjudicación.

FUENTES
=======
Infobae (11 feb 2026); La Crónica (10 feb 2026); Gaceta de Tamaulipas
DOF: Sanción publicada 10 febrero 2026
SABG (ex-SFP): Directorio de Sancionados

ACCIONES SUGERIDAS
==================
✓ Incorporado a Ground Truth (Caso 37 — GRUPO_INDUSTRIAL_ASAD_UNIFORM_FRAUD_2022_2025)
→ Solicitar expediente completo de rescisiones al IMSS e ISSSTE
→ Usar como caso de entrenamiento para detección de incumplimientos""",
        'status': 'confirmed_corrupt'
    },
    # Case 38: Grupo Zohmex
    254344: {
        'memo': """MEMO DE INVESTIGACIÓN ARIA — Grupo Zohmex SA de CV
RFC: Sin RFC en BD | Vendor ID: 254344
Tipo: Conflicto de interés + Ejecución deficiente (SEDATU)
Confianza: MEDIA

RESUMEN EJECUTIVO
=================
Grupo Zohmex SA de CV recibió contratos de construcción de SEDATU por 330 MXN (incluido contrato SEDATU-OP-009-512-2023 por 260.7M MXN). La ASF en su Cuenta Pública 2023 encontró: (1) duplicidad de conceptos causando daño probable de 14.1 MXN; (2) fallas de calidad en la ejecución; (3) conflicto de interés — Narciso Agúndez Gómez, director de la API, fungía simultáneamente como comisario de Grupo Zohmex, violando directamente las disposiciones de conflicto de interés de la LAASSP.

EVIDENCIA CLAVE
===============
• ASF Cuenta Pública 2023: Daño probable 14.1 MXN (duplicidad de conceptos)
• Conflicto de interés: Director API Narciso Agúndez Gómez = comisario Zohmex
• Violación LAASSP: Funcionario público en órgano de vigilancia del proveedor
• Base de datos: 330 MXN | 7 contratos 2020-2024 | 42.9% DA
• Risk score: 0.010 — PUNTO CIEGO SEVERO (fraude en ejecución + COI invisibles al modelo)

PATRÓN DE RIESGO
================
Caso paradigmático de limitación #1 del modelo: la corrupción en la fase de ejecución (sobrecostos, duplicidad, calidad deficiente) y los conflictos de interés en órganos de supervisión son completamente invisibles a los datos de adjudicación COMPRANET. El modelo asigna score=0.010 a pesar de irregularidades confirmadas por la ASF.

FUENTES
=======
ASF Cuenta Pública 2023 (SEDATU-OP-009-512-2023)
Expansión; Latinus; Animal Político (2024)
LAASSP Art. 52 (conflicto de interés en contratos públicos)

ACCIONES SUGERIDAS
==================
✓ Incorporado a Ground Truth (Caso 38 — GRUPO_ZOHMEX_SEDATU_CONFLICT_2023)
→ Documentar como ejemplo de falso negativo para literatura de limitaciones del modelo
→ Cruzar con declaraciones patrimoniales de Narciso Agúndez Gómez (servidores públicos)""",
        'status': 'confirmed_corrupt'
    },
    # Case 39: ADIBSA
    267054: {
        'memo': """MEMO DE INVESTIGACIÓN ARIA — ADIBSA Construcciones SA de CV
RFC: ACO160707FRA | Vendor ID: 267054
Tipo: Contrato directo SEDATU sin competencia
Confianza: BAJA

RESUMEN EJECUTIVO
=================
ADIBSA Construcciones SA de CV (RFC: ACO160707FRA, incorporada en 2016) recibió un único contrato de 129.3 MXN de SEDATU en 2023 mediante adjudicación directa, sin ninguna competencia. Forma parte del patrón de empresas de construcción que reciben contratos no competitivos de SEDATU investigadas por la ASF y reportadas por medios tras la revisión de la Cuenta Pública 2023.

EVIDENCIA CLAVE
===============
• 1 contrato SEDATU 2023 vía adjudicación directa (129.3 MXN)
• Sin competencia en el proceso de adjudicación
• Incorporada 2016 — contrato mayor 7 años después sin trayectoria establecida
• Contexto: Red de constructores SEDATU bajo investigación (ver Caso 38 Zohmex)
• Risk score: 0.016 (bajo)
• Confianza BAJA: Daño financiero individual no confirmado de manera independiente

PATRÓN DE RIESGO
================
Contrato de construcción SEDATU vía adjudicación directa a empresa sin antecedentes sólidos. Sin investigación periodística específica ni sanción SFP individual. La baja confianza refleja que este caso se incluye principalmente por el contexto del patrón SEDATU-construcción y no por evidencia directa de fraude.

FUENTES
=======
COMPRANET (datos de contrato); ASF Cuenta Pública 2023 (patrón general SEDATU)
Proceso; La Jornada (2024) — cobertura de irregularidades SEDATU

ACCIONES SUGERIDAS
==================
✓ Incorporado a Ground Truth como caso de baja confianza (Caso 39)
→ Requiere verificación independiente antes de elevar confianza
→ Buscar en ASF si contrato específico fue auditado""",
        'status': 'needs_review'
    },
    # Case 40: Drive Producciones
    245743: {
        'memo': """MEMO DE INVESTIGACIÓN ARIA — Drive Producciones SA de CV
RFC: DPR100421R59 | Vendor ID: 245743
Tipo: Fraude contractual ISSSTE (SFP inhabilitada)
Confianza: MEDIA

RESUMEN EJECUTIVO
=================
Drive Producciones SA de CV (RFC: DPR100421R59) recibió dos contratos ISSSTE el mismo día (3 julio 2019) por 335.8 MXN y 321.1 MXN respectivamente, totalizando 656.9 MXN. Ambos contratos fueron otorgados mediante Licitación Pública. Posteriormente la SFP sancionó a la empresa con inhabilitación y multa. El nombre "Producciones" es incongruente con proveedores ISSSTE típicos (sector salud/servicios institucionales), sugiriendo posible industria errónea.

EVIDENCIA CLAVE
===============
• 2 contratos ISSSTE mismo día (2019-07-03): 335.8M + 321.1M = 656.9M MXN
• Proceso: Licitación Pública (aparentemente competitivo)
• SFP: Inhabilitación + multa (SANCIONATORIA CON MULTA E INHABILITACION)
• Nombre empresa: "Producciones" — posible industria errónea (empresas de eventos→ISSSTE)
• Risk score: 0.065 (bajo — punto ciego: licitación pública reduce score a pesar de irregularidades)
• Bloqueada para nuevos contratos federales

PATRÓN DE RIESGO
================
El modelo asigna score bajo (0.065) porque el procedimiento es Licitación Pública (no DA) y la empresa no tiene historial de concentración. Sin embargo, la SFP sancionó a la empresa después de los contratos. El patrón de dos contratos el mismo día por montos casi idénticos a la misma institución puede indicar fraccionamiento de licitación o manipulación del proceso.

FUENTES
=======
SFP: Directorio de Sancionados (sanción vigente)
DOF: Publicación de inhabilitación

ACCIONES SUGERIDAS
==================
✓ Incorporado a Ground Truth (Caso 40 — DRIVE_PRODUCCIONES_ISSSTE_2019)
→ Solicitar expediente de inhabilitación SFP para conocer mecanismo específico
→ Analizar los dos procedimientos licitatorios: ¿misma licitación dividida?""",
        'status': 'confirmed_corrupt'
    },
    # Case 41: Grupo GOI SP
    258886: {
        'memo': """MEMO DE INVESTIGACIÓN ARIA — Grupo GOI SP SA de CV
RFC: GGS110208EV3 | Vendor ID: 258886
Tipo: Adjudicación directa COVID ISSSTE (SFP inhabilitada)
Confianza: MEDIA

RESUMEN EJECUTIVO
=================
Grupo GOI SP SA de CV (RFC: GGS110208EV3) recibió un contrato de 200.8 MXN de ISSSTE mediante adjudicación directa el 1 de abril de 2020 — inicio del período COVID-19 cuando las adjudicaciones directas proliferaron bajo declaración de emergencia. La SFP posteriormente sancionó a la empresa con inhabilitación y multa. Este caso forma parte del patrón de contratación de emergencia COVID que generó múltiples fraudes documentados.

EVIDENCIA CLAVE
===============
• 1 contrato ISSSTE: 200.8 MXN | Adjudicación Directa | 1 abril 2020 (COVID)
• SFP: Inhabilitación + multa (SANCIONATORIA CON MULTA E INHABILITACION)
• Contexto: Período de emergencia COVID-19 (uso intensivo de DA sin competencia)
• Risk score: 0.035 (muy bajo — punto ciego severo: empresa nueva + único contrato)
• Patrón similar al Caso 30 (BIRMEX Biomics Lab) y Caso 21 (COVID-19 Emergency)

PATRÓN DE RIESGO
================
Empresa de un solo contrato que aparece durante la emergencia COVID para obtener adjudicación directa de alta valor con ISSSTE, luego inhabilitada. Score muy bajo (0.035) porque no hay concentración histórica ni co-licitación detectable. Ilustra la vulnerabilidad de los sistemas de detección ante vendedores nuevos de uso único (ver también Konkistolo y FamilyDuck, Casos 32).

FUENTES
=======
SFP: Directorio de Sancionados (sanción vigente)
DOF: Publicación de inhabilitación

ACCIONES SUGERIDAS
==================
✓ Incorporado a Ground Truth (Caso 41 — GRUPO_GOI_SP_ISSSTE_COVID_2020)
→ Cruzar RFC con expedientes COVID de la Secretaría de Salud y CONACYT
→ Investigar si existía vínculo con funcionarios ISSSTE que autorizaron el DA""",
        'status': 'confirmed_corrupt'
    },
    # Case 42: Mednes Solutions
    232878: {
        'memo': """MEMO DE INVESTIGACIÓN ARIA — Mednes Solutions SA de CV
RFC: MSO160926C28 | Vendor ID: 232878
Tipo: Sobreprecio en suministros médicos IMSS/INSABI (SFP inhabilitada)
Confianza: MEDIA

RESUMEN EJECUTIVO
=================
Mednes Solutions SA de CV (RFC: MSO160926C28) proveyó insumos médicos a IMSS e INSABI a través de 44 contratos entre 2019 y 2020, totalizando 145 MXN. La empresa contrató tanto mediante licitación pública como adjudicación directa. La SFP sancionó a la empresa con inhabilitación y multa. En el contexto del escándalo de sobreprecio farmacéutico IMSS 2019-2022 (ver Casos 31 y 30), este perfil corresponde al patrón de pequeñas empresas proveedoras de insumos médicos con precios sobre consolidados.

EVIDENCIA CLAVE
===============
• 44 contratos IMSS+INSABI 2019-2020: 145 MXN total
• Múltiples tipos de contratación: LP, DA, Otras Contrataciones
• SFP: Inhabilitación + multa (SANCIONATORIA CON MULTA E INHABILITACION)
• Risk scores: 0.23-0.27 (MEDIUM — parcialmente detectado por el modelo)
• Patrón similar a Caso 31 (IMSS Diabetes Ring) — pequeños proveedores de insumos médicos

PATRÓN DE RIESGO
================
A diferencia de otros casos con score bajo, este vendedor tiene scores medios (0.23-0.27) que el modelo detecta correctamente como elevados para el sector salud. Ilustra que el modelo sí funciona para proveedores con historial más extenso (44 contratos). La confirmación SFP eleva la confianza de la clasificación.

FUENTES
=======
SFP: Directorio de Sancionados (sanción vigente)
DOF: Publicación de inhabilitación
Contexto: Animal Político; MCCI (red de proveedores médicos IMSS 2019-2022)

ACCIONES SUGERIDAS
==================
✓ Incorporado a Ground Truth (Caso 42 — MEDNES_SOLUTIONS_IMSS_INSABI_2019_2020)
→ Comparar precios unitarios en los 44 contratos vs precios consolidados IMSS
→ Investigar si pertenece a red vinculada con otros proveedores del período""",
        'status': 'confirmed_corrupt'
    },
}

updated = 0
for vendor_id, data in memos.items():
    # Check if in aria_queue
    row = conn.execute('SELECT id FROM aria_queue WHERE vendor_id=?', (vendor_id,)).fetchone()
    if row:
        conn.execute('''UPDATE aria_queue SET
            memo_text=?, memo_generated_at=?,
            review_status=?, in_ground_truth=1,
            reviewed_at=?
            WHERE vendor_id=?''',
            (data['memo'], today, data['status'], today, vendor_id))
        updated += 1
        print(f'  Updated memo for vendor {vendor_id}')
    else:
        print(f'  WARN: vendor {vendor_id} not in aria_queue')

conn.commit()
print(f'\nUpdated {updated} ARIA memos')
conn.close()

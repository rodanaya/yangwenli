"""Write investigation memos for GT cases 295-297 into aria_queue."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

MEMOS = {
    103353: {
        'case_id': 'TALLER_ELECTRICO_GONZALEZ_IMSS_NL_DA',
        'memo': """
MEMO DE INVESTIGACIÓN — CASO GT-295
Vendor: TALLER ELECTRICO GONZALEZ SA DE CV (VID=103353)
IPS ARIA: 0.660 | Risk Score: 0.957 | Patrón: P6 (Captura Institucional)
Generado: {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMEN DEL CASO

Taller Eléctrico González SA de CV (sin RFC registrado) presenta un perfil
de captura institucional altamente concentrado: 22 de sus 23 contratos
(95.7%) son con el IMSS Delegación Regional Nuevo León, con un valor total
de 1.008B MXN. El 97.7% de ese valor (984.6M MXN) proviene de un único
contrato de 2021. La empresa opera sin RFC registrado en COMPRANET y acumula
82.6% de adjudicaciones directas sobre el total de sus contratos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HALLAZGOS PRINCIPALES

1. CONCENTRACIÓN EXTREMA EN CLIENTE ÚNICO
   — 22/23 contratos con IMSS NL (95.7% del total)
   — 1 contrato adicional con CFE por 61,350 MXN (irrelevante en monto)
   — Dependencia total de un único organismo público

2. MEGA-CONTRATO 2021: SEÑAL DE ALERTA PRIMARIA
   — Contrato 2021: 984,554,800 MXN (984.6M) por "servicio de mantenimiento
     preventivo y correctivo a equipo" en IMSS NL
   — Representa el 97.7% del valor histórico total del proveedor
   — Descripción idéntica a contratos similares de 3GH Multiservicios
     (VID=178705) en el mismo año, misma delegación y montos comparables
   — Un único contrato de esta magnitud para mantenimiento electromecánico
     hospitalario es inusual sin licitación pública formal

3. TASA DE ADJUDICACIÓN DIRECTA: 82.6%
   — 19 de 23 contratos son adjudicaciones directas
   — Los 4 contratos licitados (2021, 2022, 2024) aparecen después de que
     el mega-contrato ya consolidó la relación con IMSS
   — Posible presión regulatoria tardía sin ruptura real del monopolio

4. AUSENCIA DE RFC
   — Sin número de RFC registrado impide:
     * Verificación en padrón SAT
     * Cruce con lista EFOS definitivo
     * Verificación de sanciones SFP por homoclave
   — Empresa constituida formalmente (SA de CV) pero sin trazabilidad fiscal

5. PERFIL TEMPORAL
   — Primera actividad: 2013 (contratos menores 68K–257K MXN)
   — Escalamiento abrupto: 2021 → 984.6M MXN en un solo contrato
   — Continuidad post-2021: contratos menores 8.6M (2024) y 10.2M (2022)
   — El salto de escala 2013→2021 (factor ~3,800x) es anómalo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXTO COMPARATIVO

La coincidencia temporal y descriptiva con 3GH MULTISERVICIOS S.A. DE C.V.
(VID=178705, caso GT-296) es el elemento más crítico:

  Taller Eléctrico González 2021 IMSS NL:  984,554,800 MXN (adjudicación pública)
  3GH Multiservicios 2021 IMSS NL:          941,104,497 MXN (adjudicación pública)

Ambas empresas, sin RFC, proveen "mantenimiento preventivo y correctivo a
equipo" al mismo organismo (IMSS Delegación NL) en el mismo año fiscal con
descripciones prácticamente idénticas. La suma de ambos contratos 2021
asciende a 1.926B MXN para servicios electromecánicos en una sola delegación
regional. Esto sugiere posible:
  (a) Fragmentación deliberada para superar umbrales de licitación
  (b) Rotación organizada entre proveedores relacionados
  (c) Acuerdo colusorio de precios o distribución de mercado

Para contratos superiores a ciertos umbrales, la normativa LAASSP exige
licitación pública internacional o nacional — la asignación directa de
984M requiere justificación excepcional documentada.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VEREDICTO Y RECOMENDACIONES

Clasificación: ALTA PRIORIDAD — Captura institucional probable con posible
colusión entre proveedores afines.

Confianza: ALTA — Múltiples indicadores convergentes (mono-cliente, mega-
contrato DA, ausencia RFC, gemelo empresarial contemporáneo).

Acciones recomendadas:
  1. Solicitar expediente completo del contrato 2021 vía INFOMEX/PNT
  2. Investigar vinculación empresarial entre Taller Eléctrico González y
     3GH Multiservicios (socios, domicilio, representante legal)
  3. Cruzar con Cuenta Pública ASF 2021 para auditorías al IMSS NL
  4. Verificar si el contrato 2021 cumplió procedimiento de excepción LAASSP
  5. Consultar Directorio de Empresas del SAT por nombre para obtener RFC
""".strip(),
    },
    178705: {
        'case_id': '3GH_MULTISERVICIOS_IMSS_NL_DA',
        'memo': """
MEMO DE INVESTIGACIÓN — CASO GT-296
Vendor: 3GH MULTISERVICIOS S.A. DE C.V. (VID=178705)
IPS ARIA: 0.660 | Risk Score: 1.000 | Patrón: P6 (Captura Institucional)
Generado: {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMEN DEL CASO

3GH Multiservicios S.A. de C.V. (sin RFC registrado) obtiene el 100% de sus
contratos con el IMSS Delegación Regional Nuevo León. Con un risk score de
1.000 (máximo posible), 13 contratos acumulando 1.026B MXN entre 2016 y
2021, y el 91.7% de su valor concentrado en un único contrato de 2021, el
perfil es prácticamente idéntico al de Taller Eléctrico González (GT-295),
con quien comparte institución cliente, año de mega-contrato y descripción
de servicios.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HALLAZGOS PRINCIPALES

1. RISK SCORE MÁXIMO: 1.000
   — Score más alto posible en el modelo v5.1
   — Coloca al proveedor en percentil 99+ de riesgo del universo de 3.1M contratos

2. MEGA-CONTRATO 2021: GEMELO DEL CASO GT-295
   — Contrato 2021 (licitación pública): 941,104,497 MXN
     "SERVICIO DE MANTENIMIENTO PREVENTIVO Y CORRECTIVO A EQUIPO"
   — Contrato adicional 2021 (DA): 68,781,745 MXN
     "REPARACION MAYOR A MOTOR ELECTRICO MARCA YORK DE 440 HP"
   — Total 2021 IMSS NL: 1,009,886,242 MXN
   — Descripción de mantenimiento preventivo/correctivo idéntica a GT-295

3. PATRON DA MIXTO: 53.8%
   — 7 de 13 contratos son adjudicaciones directas (53.8%)
   — Los contratos más grandes (941M y 68.8M) tienen diferente modalidad
   — Contratos pequeños 2016-2019 (47K-5.1M) son mayoritariamente DA

4. AUSENCIA DE RFC — MISMO PROBLEMA QUE GT-295
   — Sin RFC: imposible verificar en SAT, EFOS, SFP
   — Dos empresas sin RFC, misma especialidad, mismo cliente, mismo año

5. COINCIDENCIA TEMPORAL Y SECTORIAL CON GT-295
   — Ambas empresas aparecen activas en IMSS NL con contratos similares
   — La suma de los contratos 2021 de ambas = 1.926B MXN para una delegación
   — Contratos anteriores (2016-2019) de 3GH son modestos (47K-5.1M)
   — El salto a 941M en 2021 es abrupto y requiere explicación

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HIPÓTESIS DE RIESGO

HIPÓTESIS A — COLUSIÓN / ROTACIÓN:
Taller Eléctrico González y 3GH Multiservicios son empresas relacionadas
(posiblemente mismo propietario, familiares, o red empresarial) que rotan
contratos de mantenimiento electromecánico en IMSS NL. En 2021 ambas reciben
contratos comparables de 984M y 941M respectivamente. Esta rotación permite
superar límites individuales de adjudicación directa o crear apariencia de
competencia.

HIPÓTESIS B — MONOPOLIO DE MANTENIMIENTO HOSPITALARIO NL:
Existe un mercado cautivo de mantenimiento electromecánico hospitalario en
Nuevo León controlado por un pequeño grupo de empresas sin competencia real.
La nomenclatura "3GH" podría aludir a los nombres de tres socios (G-G-H) o
referir a la capacidad técnica (tres fases de generación alta). Sin más
datos societarios, ambas hipótesis son viables.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VEREDICTO Y RECOMENDACIONES

Clasificación: ALTA PRIORIDAD — Monopolio concentrado / colusión probable
con GT-295.

Confianza: MEDIA-ALTA — Risk score máximo, patrón idéntico a GT-295,
aunque falta confirmación de vínculo empresarial directo.

Acciones recomendadas:
  1. Investigar acta constitutiva de 3GH Multiservicios SA de CV
     (socios, representante legal, domicilio fiscal)
  2. Comparar domicilios y representantes con Taller Eléctrico González
  3. Solicitar INFOMEX sobre el contrato 941M: justificación de excepción,
     cotizaciones previas, supervisión de entrega
  4. Verificar con ASF si el IMSS NL fue auditado en Cuenta Pública 2021
  5. Explorar si hubo procedimiento de consolidación de mantenimiento
     o si los contratos se asignaron en lotes separados artificialmente
""".strip(),
    },
    103197: {
        'case_id': 'MEXICO_MONTECITOS_SEDENA_BALISTICO_DA',
        'memo': """
MEMO DE INVESTIGACIÓN — CASO GT-297
Vendor: MEXICO MONTECITOS SA DE CV (VID=103197)
IPS ARIA: 0.657 | Risk Score: 0.824 | Patrón: P6 (Captura Institucional)
Generado: {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMEN DEL CASO

México Montecitos SA de CV (sin RFC registrado) es proveedor especializado
de material balístico y equipo de protección para la Secretaría de la Defensa
Nacional (SEDENA), con 30 contratos entre 2013 y 2020 por 1.351B MXN. El
perfil de adjudicaciones directas (60%) y la magnitud de contratos individuales
(hasta 361M en un solo contrato) plantean dudas sobre el proceso competitivo,
aunque el sector Defensa tiene características estructurales que justifican
parcialmente la concentración.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HALLAZGOS PRINCIPALES

1. ESPECIALIZACIÓN EN MATERIAL BALÍSTICO SEDENA
   Contratos explícitos identificados:
   — 2020: "ADQUISICIÓN DE PLACAS BALÍSTICAS STAND ALONE NIVEL ESPECIAL FAVE01-01"
     → 266,641,764 MXN (licitación pública)
   — 2018: "ADQUISICIÓN DE MATERIAL BALÍSTICO"
     → 231,351,975 MXN (adjudicación directa)
   — 2019: "ADQUISICIÓN DE MATERIAL BALISTICO"
     → 56,603,312 MXN (licitación pública)
   Total contratos explícitamente balísticos: ~554M MXN
   Contratos sin descripción (2013-2018): ~796M MXN adicionales

2. MEGA-CONTRATO 2015 SIN DESCRIPCIÓN: 361.3M MXN (DA)
   — El contrato mayor es una adjudicación directa de 361M en 2015 sin descripción
   — Para una adjudicación directa en Defensa de esta magnitud se requiere
     justificación excepcional bajo LAASSP Art. 41
   — La ausencia de descripción en COMPRANET dificulta la evaluación

3. TASA DA: 60% (18/30 contratos)
   — 18 contratos adjudicados directamente, 12 por licitación
   — Los contratos DA incluyen los de mayor valor individual
   — Sector Defensa tiene AUC modelo más bajo (0.76) — cautela en interpretación

4. DISTRIBUCIÓN TEMPORAL 2013-2020
   — Activo exclusivamente bajo administraciones PRI (2013-2018) y PAN-alternancia
   — Cese de actividad en 2020/2021 podría indicar cambio de proveedor preferido
     con nueva administración, o cumplimiento contractual natural

5. CLIENTE SECUNDARIO: SSP CDMX (5 contratos, 14.6M MXN, 100% DA)
   — Policía de la Ciudad de México también adquiere material de seguridad
   — Montos menores pero patrón DA completo en cliente secundario

6. SIN RFC REGISTRADO
   — Imposibilidad de verificación SAT/EFOS/SFP
   — Para empresa con 1.35B en contratos Defensa, la ausencia de RFC en
     COMPRANET es inusual (puede ser omisión de captura, no necesariamente
     que la empresa carezca de RFC)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXTO Y CONSIDERACIONES ESPECIALES DEL SECTOR

El sector Defensa en México presenta características estructurales que
diferencian sus patrones de contratación:

  a) SECRETO DE INFORMACIÓN: Contratos de material bélico y balístico
     pueden clasificarse como información reservada bajo Ley de Seguridad
     Nacional, lo que explica ausencia de descripciones en COMPRANET

  b) PROVEEDORES CERTIFICADOS: El acceso a contratos SEDENA requiere
     habilitación de seguridad y certificaciones específicas, lo que
     reduce naturalmente el universo de competidores elegibles

  c) HOMOLOGACIÓN TÉCNICA: Las "placas balísticas nivel especial" siguen
     especificaciones técnicas militares que pueden limitar a proveedores
     que cumplen el estándar NIJ o equivalente mexicano

  d) AUC MODELO v5.1 EN DEFENSA: 0.7612 (más bajo de los 12 sectores)
     Menor capacidad discriminatoria del modelo para este sector

Estas consideraciones no eliminan el riesgo, pero rebajan la confianza
en el diagnóstico automático vs. otros sectores.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VEREDICTO Y RECOMENDACIONES

Clasificación: PRIORIDAD MEDIA — Patrón de concentración y DA en Defensa
merece investigación, pero con contexto sectorial que puede justificar
parcialmente el perfil.

Confianza: MEDIA — Risk score 0.824 es alto pero el sector Defensa tiene
características estructurales atenuantes. Sin RFC, verificación limitada.

Acciones recomendadas:
  1. Identificar RFC de México Montecitos SA de CV via Registro Público de
     Comercio o consulta directa SIEM/SE
  2. Verificar si la empresa tiene habilitación SEDENA como proveedor
     de material bélico/balístico (Dirección General de Industria Militar)
  3. Solicitar INFOMEX sobre contratos DA >50M: fundamento legal de excepción
  4. Consultar ASF Cuentas Públicas 2013-2020 para auditorías SEDENA
     relacionadas con adquisición de material balístico
  5. Investigar si México Montecitos tiene vínculos con empresas extranjeras
     fabricantes de blindaje balístico (posible comisionista/intermediario)
  6. Comparar precios unitarios de placas balísticas con licitaciones
     equivalentes en otras fuerzas armadas latinoamericanas
""".strip(),
    },
}


def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    now = datetime.now().strftime('%Y-%m-%d %H:%M')

    for vendor_id, data in MEMOS.items():
        memo_text = data['memo'].format(date=now)
        result = cur.execute("""
            UPDATE aria_queue
            SET memo_text=?, memo_generated_at=datetime('now')
            WHERE vendor_id=?
        """, (memo_text, vendor_id))
        rows = result.rowcount
        if rows == 0:
            print(f"WARNING: VID={vendor_id} not found in aria_queue — memo not written")
        else:
            print(f"VID={vendor_id}: memo written ({len(memo_text)} chars, {rows} row updated)")

    conn.commit()
    conn.close()
    print("\nDone.")


if __name__ == '__main__':
    write_memos()

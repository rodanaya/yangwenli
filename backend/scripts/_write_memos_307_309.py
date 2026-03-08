"""Write ARIA investigation memos (Spanish) for GT cases 307-309.

Cases:
  307 — Grimann: distribuidor medicamento patente IMSS (confianza baja, posible FP)
  308 — DLP Medical: material curacion IMSS mega-contrato 1.29B sin RFC
  309 — Prodifarma: servicio integral diabetes IMSS 580M sin RFC
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
import json
from pathlib import Path
from datetime import date

DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

MEMOS = {
    307: {
        "vendor_id": 20375,
        "vendor_name": "GRIMANN, S.A. DE C.V.",
        "tier": 3,
        "memo_title": "Memo de Investigacion: Grimann — Distribuidor de Medicamento de Patente IMSS/ISSSTE",
        "memo_es": """## Resumen Ejecutivo

GRIMANN S.A. DE C.V. (VID=20375) presenta un perfil de riesgo estadistico elevado (RS=0.990, IPS=0.642) derivado principalmente de su tasa de adjudicacion directa del 81.2% en 16 contratos entre 2005 y 2025. Sin embargo, el analisis de los titulos de contrato revela un patron consistente con proveedor autorizado de farmaco de patente unica, no con corrupcion estructural.

## Hallazgos Clave

**Perfil de Contratos (2005-2025)**
- 16 contratos | 0.57B MXN total | 0% single-bid | 81.2% adjudicacion directa
- Instituciones: IMSS (71.9% del valor), IMSS Bienestar (25.2%), ISSSTE, INCAN, INPEDIO, Hospital General Mexico
- Sin RFC registrado en COMPRANET

**Titulos de Contrato — Evidencia Clave**
Todos los contratos de 2025 (suma: 559M MXN, 97.4% del total) llevan el titulo identico:
*"COMPRA CONSOLIDADA DE MEDICAMENTOS (1 CLAVE) PATENTE 2025-2026"*

Este titulo indica:
1. Compra consolidada del sector salud (mecanismo IMSS que agrega demanda de multiples instituciones)
2. Una sola clave de medicamento (monoproducto)
3. Medicamento de patente (exclusividad legal)

**Marco Legal**
La Ley de Adquisiciones, Arrendamientos y Servicios del Sector Publico (LAASSP), Art. 41, fraccion IV, permite la adjudicacion directa cuando *"existan razones justificadas para la adquisicion [...] de bienes de fabricacion exclusiva o con derechos de propiedad intelectual"*. Un farmaco de patente vigente en manos de un solo titular/distribuidor autorizado califica plenamente para este mecanismo.

## Evaluacion de Riesgo

**Por que el modelo asigna RS=0.990:**
El modelo de riesgo v5.1 captura correctamente las senales estadisticas (alta DA, concentracion, multiples instituciones). Sin embargo, el contexto legal del medicamento de patente hace que estas senales sean ESPERADAS, no anomalas.

**Indicadores de Falso Positivo:**
- Titulo explicito menciona "PATENTE" — inusual para contratos corruptos (que tipicamente usan titulos genericos)
- Participacion en compras consolidadas (mecanismo de agregacion que implica supervision multisectorial)
- Presencia continua 2005-2025 (20 anos) — los esquemas de corrupcion tipicamente son mas efimeros
- Distribucion entre 7 instituciones diferentes en 2025 — coherente con compra consolidada, no con capture institucional

## Recomendaciones

1. **Verificar en IMPI** (Instituto Mexicano de la Propiedad Industrial) que el farmaco suministrado tiene patente vigente y que Grimann es distribuidor autorizado del titular.
2. **Consultar Cuadro Basico IMSS** para confirmar que la clave existe y es de patente.
3. **No incluir** en ground truth hasta confirmar o descartar la exclusividad farmaceutica.
4. **Clasificacion provisional**: Posible falso positivo estructural (farmaco de patente = DA legal).

## Conclusion

La evidencia disponible en COMPRANET es INSUFICIENTE para clasificar a Grimann como caso de corrupcion. El patron observado es completamente coherente con un distribuidor legal de farmaco de patente unica bajo mecanismo de compra consolidada IMSS. Se requiere verificacion externa antes de cualquier accion adicional. Confianza del caso: BAJA.""",
        "pattern_type": "concentrated_monopoly",
        "ips_final": 0.642,
        "risk_score": 0.990,
    },
    308: {
        "vendor_id": 4642,
        "vendor_name": "DLP MEDICAL, S.A. DE C.V.",
        "tier": 2,
        "memo_title": "Memo de Investigacion: DLP Medical — Mega-Contrato Material Curacion IMSS 1.29B Sin RFC",
        "memo_es": """## Resumen Ejecutivo

DLP MEDICAL S.A. DE C.V. (VID=4642) acumulo 1.29 billones MXN en 72 contratos de material de curacion, estomatologia, radiologico y de laboratorio entre 2002 y 2007. El perfil es critico (RS=1.000, IPS=0.661): un proveedor sin RFC, dominado por un unico megacontrato IMSS de 1.146B MXN en 2006 (88.7% del total), que desaparece de COMPRANET en 2007. Este patron es anomalo y justifica investigacion prioritaria.

## Hallazgos Clave

**Perfil de Contratos (2002-2007)**
- 72 contratos | 1.29B MXN total | 0% adjudicacion directa | 2.8% single-bid
- Distribucion institucional: IMSS 91.3% (1.18B), ISSSTE 6.0% (78M), sistemas estatales de salud 2.7%
- Sin RFC registrado — impide verificacion SAT/EFOS

**El Megacontrato de 2006**
Contrato singular: 1,146,233,199 MXN (~1.15 billones) con IMSS para "MATERIAL DE CURACION" en 2006.
- Representa el 88.7% del valor historico total del proveedor
- Importe extraordinario para un distribuidor de material de curacion en ese periodo
- No hay evidencia de que sea medicamento patentado — categoria es material de curacion/radiologico generico
- Multiples delegaciones IMSS servidas (patron de distribucion federal)

**Anomalias Identificadas**
1. **Concentracion extrema en un solo contrato**: 88.7% en un unico contrato es estadisticamente anormal para distribuidores legitimos que tipicamente diversifican por delegacion/periodo
2. **Cese abrupto post-2007**: Un proveedor que alcanza 1.15B en un solo contrato IMSS no deberia desaparecer completamente de COMPRANET el ano siguiente
3. **Sin RFC**: La ausencia de clave tributaria en un proveedor de esta magnitud dificulta toda auditoria
4. **Periodo 2002-2007**: Corresponde a la administracion Fox (2000-2006) y transicion Calderon (2006-2012), periodo con escandalo de compras medicas IMSS

**Contexto Historico**
El IMSS fue objeto de multiples observaciones de la ASF en el periodo 2002-2007 por irregularidades en adquisicion de material medico. El Organo Interno de Control del IMSS detecto patrones de sobre-precio y adjudicaciones irregulares en insumos medicos en este periodo.

## Evaluacion de Riesgo

**Senales de Alerta Criticas:**
- RS=1.000 (maximo) + IPS ARIA=0.661
- Un distribuidor de material generico (no patentado) con 1.15B en un solo contrato
- Desaparicion post-2007 — tipico de empresa de proposito especifico o "empresa de maletin"
- Sin RFC — imposibilidad de rastrear persona moral en SAT

**Senales Atenuantes:**
- 0% adjudicacion directa — todos los contratos fueron licitados, lo que implica algun proceso competitivo
- 72 contratos en 5 anos — actividad dispersa en multiples procedimientos (no solo el megacontrato)
- Material de curacion es categoria legitima con demanda estructural en IMSS

## Recomendaciones

1. **Buscar en ASF Cuenta Publica 2006** el contrato IMSS de 1.146B — es lo suficientemente grande para haber sido auditado
2. **Verificar en DOF (Diario Oficial)** la licitacion publica de "MATERIAL DE CURACION" IMSS 2006 por el monto correspondiente
3. **Investigar persona moral** DLP MEDICAL S.A. DE C.V. en Registro Publico de Comercio (sin RFC no es imposible — buscar por nombre)
4. **Cruzar con EFOS SAT** si se identifica RFC a futuro
5. **Prioridad MEDIA-ALTA**: El patron (mega-contrato + sin RFC + desaparicion) es consistente con empresa de proposito especifico usada para canalizar un contrato IMSS de gran volumen

## Conclusion

DLP MEDICAL presenta un perfil de riesgo genuinamente elevado que merece investigacion activa. La combinacion de: (a) magnitud extraordinaria del contrato, (b) ausencia de RFC, (c) cese abrupto de actividad, y (d) periodo de mayor vulnerabilidad institucional en compras IMSS constituye un conjunto de senales de alerta que exceden la explicacion estadistica habitual. Confianza del caso: MEDIA. Se recomienda escalacion a investigacion documental.""",
        "pattern_type": "concentrated_monopoly",
        "ips_final": 0.661,
        "risk_score": 1.000,
    },
    309: {
        "vendor_id": 19872,
        "vendor_name": "PRODIFARMA PROMOCIONES Y DISTRIBUCIONES FARMACEUTICAS S.A. DE C.V.",
        "tier": 2,
        "memo_title": "Memo de Investigacion: Prodifarma — Servicio Integral Diabetes IMSS Veracruz 580M",
        "memo_es": """## Resumen Ejecutivo

PRODIFARMA PROMOCIONES Y DISTRIBUCIONES FARMACEUTICAS S.A. DE C.V. (VID=19872) obtuvo en 2005 un contrato con el IMSS por 580 millones MXN para la prestacion de un "Servicio Integral para la Deteccion de Diabetes Mellitus" en las delegaciones Veracruz Norte y Veracruz Sur. Este contrato representa el 99.5% del valor historico total del proveedor. El modelo de negocio — servicio integral de diagnostico con equipamiento propio — genera dependencia cautiva que es un patron de riesgo reconocido en compras publicas de salud.

## Hallazgos Clave

**Perfil de Contratos (2005-2009)**
- 26 contratos | 0.583B MXN total | 0% adjudicacion directa | 15.4% single-bid
- Concentracion: 99.5% del valor en IMSS (582.9M de 583.3M total)
- Sin RFC registrado
- RS=1.000, IPS ARIA=0.658

**El Contrato Dominante de 2005**
- Monto: 580,164,150 MXN — "Servicio Integral para la Deteccion de Diabetes Mellitus"
- Instituciones: IMSS Delegacion Veracruz Norte y Veracruz Sur
- Modalidad: Licitacion publica (no adjudicacion directa)
- Descripcion indica servicio de screening de diabetes a nivel regional

**Modelo de Negocio — Analisis**
El modelo de "servicio integral de deteccion de diabetes" tipicamente incluye:
- Provision de glucometros y equipos de medicion en comodato
- Suministro continuo de cintas reactivas, lancetas y consumibles
- Personal tecnico para operacion
- Reporte de resultados a la institucion

Los contratos posteriores de 2006 (cinta+lanceta para glucometros: 1.1M; deteccion diabetes: 400K; lancetas y cintas: 310K) son coherentes con el suministro continuo de insumos para equipos ya instalados bajo el contrato de 580M — patrón de "equipo cautivo".

**Senales de Riesgo**
1. **15.4% single-bid**: 4 de 26 contratos resultaron con un solo licitante en procedimientos competitivos
2. **Modelo cautivo**: Los equipos instalados en 2005 generan dependencia de insumos del mismo proveedor
3. **Sin RFC**: Dificulta auditoria tributaria y verificacion de existencia real de la empresa
4. **Concentracion geografica**: 99.5% en dos delegaciones IMSS de Veracruz en el periodo 2005-2006

**Contexto Regional**
El estado de Veracruz en el periodo 2004-2010 registra multiples observaciones de la ASF en compras IMSS, incluyendo servicios medicos con modelos de provision integral. La deteccion de diabetes masiva era una prioridad de politica publica en ese periodo (Plan Nacional de Salud 2001-2006), lo que generaba grandes presupuestos para programas de screening.

## Evaluacion de Riesgo

**Factores que Elevan el Riesgo:**
- Contrato de 580M en servicio de diagnostico para una sola empresa en una region (proporcion alta por delegacion)
- Sin RFC — empresa "invisible" para SAT
- Modelo de servicio integral que genera dependencia garantizada post-contrato
- 15.4% single-bid en procedimientos subsecuentes (insumos para equipo instalado)

**Factores Atenuantes:**
- El modelo de servicio integral de diabetes es una modalidad legitima usada en muchos paises
- La licitacion publica para el contrato principal implica proceso competitivo (aunque puede haber sido amapado con especificaciones a medida)
- No hay evidencia directa de sobreprecio — requiere comparacion con precios de mercado de glucometros/cintas de 2005

## Recomendaciones

1. **ASF Cuenta Publica 2005**: Buscar auditoria del programa de deteccion de diabetes IMSS Veracruz — contrato de 580M deberia estar auditado
2. **Verificar licitacion en DOF**: Buscar la convocatoria original para determinar si las especificaciones tecnicas favorecian artificialmente a Prodifarma
3. **Precios de mercado**: Comparar el costo por deteccion (580M / numero de pruebas proyectadas) con benchmarks internacionales
4. **Identificar RFC o datos de constitucion**: Prodifarma puede identificarse en Registro Publico de Comercio del estado de Veracruz
5. **Vigilar patron**: Si el modelo "servicio integral + equipo cautivo" se repite en otras empresas farmaceuticas del mismo periodo en IMSS, puede ser patron sistemico

## Conclusion

PRODIFARMA presenta un perfil de riesgo MEDIO-ALTO con elementos que justifican investigacion documental. El contrato de 580M para screening de diabetes en Veracruz es extraordinariamente grande para una empresa sin RFC y sin actividad post-2009. El modelo de servicio integral (equipo+insumos) es un vector conocido de corrupcion en salud publica. Sin embargo, la modalidad de licitacion publica y el alineamiento con politicas de salud de la epoca requieren verificacion antes de clasificar como caso confirmado. Confianza: MEDIA.""",
        "pattern_type": "concentrated_monopoly",
        "ips_final": 0.658,
        "risk_score": 1.000,
    },
}


def write_memos():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()

    # Check if aria_queue has a memo column
    cols = [c[1] for c in cur.execute("PRAGMA table_info(aria_queue)").fetchall()]
    has_memo = "investigation_memo" in cols
    has_memo_es = "investigation_memo_es" in cols
    has_review = "review_notes" in cols
    print(f"aria_queue columns check: investigation_memo={has_memo}, memo_es={has_memo_es}, review_notes={has_review}")

    # Also try aria_runs or aria_memos if they exist
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    aria_tables = [t for t in tables if 'aria' in t.lower()]
    print(f"ARIA tables: {aria_tables}")

    for case_db_id, memo_data in MEMOS.items():
        vendor_id = memo_data["vendor_id"]

        # Update aria_queue if vendor exists there
        if has_memo_es:
            cur.execute(
                "UPDATE aria_queue SET investigation_memo_es=?, review_status='memo_generated' WHERE vendor_id=?",
                (memo_data["memo_es"], vendor_id),
            )
            print(f"  Updated aria_queue memo_es for VID={vendor_id} ({cur.rowcount} rows)")
        elif has_memo:
            cur.execute(
                "UPDATE aria_queue SET investigation_memo=?, review_status='memo_generated' WHERE vendor_id=?",
                (memo_data["memo_es"], vendor_id),
            )
            print(f"  Updated aria_queue investigation_memo for VID={vendor_id} ({cur.rowcount} rows)")
        else:
            print(f"  aria_queue has no memo column — skipping queue update for VID={vendor_id}")

        # Check if aria_investigation_memos table exists
        if "aria_investigation_memos" in aria_tables:
            cur.execute(
                """INSERT OR REPLACE INTO aria_investigation_memos
                   (vendor_id, memo_title, memo_text, memo_language, tier, pattern_type,
                    risk_score, ips_final, generated_at, generated_by)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    vendor_id,
                    memo_data["memo_title"],
                    memo_data["memo_es"],
                    "es",
                    memo_data["tier"],
                    memo_data["pattern_type"],
                    memo_data["risk_score"],
                    memo_data["ips_final"],
                    date.today().isoformat(),
                    "template_v1",
                ),
            )
            print(f"  Inserted into aria_investigation_memos for VID={vendor_id}")

        # Update GT case notes with memo reference
        cur.execute(
            """UPDATE ground_truth_cases
               SET notes = notes || char(10) || '[MEMO GENERADO: ' || ? || ']'
               WHERE id=? AND notes NOT LIKE '%MEMO GENERADO%'""",
            (date.today().isoformat(), case_db_id),
        )
        print(f"  GT case {case_db_id} notes updated ({cur.rowcount} rows)")

        # Print memo to stdout for reference
        print(f"\n{'='*70}")
        print(f"MEMO — Case {case_db_id} | VID={vendor_id} | {memo_data['vendor_name']}")
        print(f"{'='*70}")
        print(memo_data["memo_es"][:500] + "...")
        print()

    conn.commit()
    print("\nMemo write complete.")
    conn.close()


if __name__ == "__main__":
    write_memos()

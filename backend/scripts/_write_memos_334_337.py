"""Write ARIA memos for GT cases 334-337."""
import sqlite3, os

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")

MEMOS = {
    96263: (
        "## Investigacion: DENTILAB (VID 96263)\n\n"
        "**Riesgo**: 0.998 (Critico) | **Monto total**: 519.5M MXN | **Contratos**: 9 (2010-2019)\n\n"
        "### Hallazgos principales\n\n"
        "1. **Concentracion institucional extrema**: 100% de contratos con IMSS.\n"
        "2. **Sin RFC registrado**: Imposibilita verificacion cruzada con SAT/EFOS.\n"
        "3. **Patron de suministro dental/medico**: Contratos por material de curacion "
        "y productos biologicos concentrados en 2013 (5 contratos, 462M MXN).\n"
        "4. **Licitacion publica dominante**: 78% via procedimiento competitivo — sugiere "
        "capacidad de ganar licitaciones consistentemente.\n\n"
        "### Evaluacion\n\n"
        "Proveedor con concentracion extrema en suministros medicos IMSS. "
        "El puntaje de riesgo 0.998 refleja la combinacion de alta concentracion "
        "institucional y volatilidad de precios. Sin RFC, no es posible verificar "
        "estatus fiscal. Se recomienda cruce con Cuenta Publica ASF.\n\n"
        "**Confianza**: Media | **Patron**: Monopolio concentrado",
        "reviewed",
    ),
    13908: (
        "## Investigacion: LABORATORIOS DE BIOLOGICOS Y REACTIVOS DE MEXICO (VID 13908)\n\n"
        "**Riesgo**: 0.918 (Critico) | **Monto total**: 2,614M MXN | **Contratos**: 48 (2003-2010)\n\n"
        "### Hallazgos principales\n\n"
        "1. **ENTIDAD PARAESTATAL**: BIRMEX es un laboratorio de propiedad estatal, "
        "creado por decreto presidencial. NO es un proveedor privado.\n"
        "2. **FALSO POSITIVO CONFIRMADO**: El puntaje alto (0.918) es resultado de la "
        "concentracion natural de un productor estatal de vacunas.\n"
        "3. **100% licitacion publica**: Ningun contrato por adjudicacion directa.\n"
        "4. **Clientes naturales**: IMSS, Secretaria de Salud, ISSSTE — compradores "
        "logicos de vacunas.\n\n"
        "### Evaluacion\n\n"
        "BIRMEX es el laboratorio nacional de vacunas de Mexico. Su concentracion en "
        "el sector salud es estructural, no indicativa de corrupcion. Este caso se "
        "incluye en ground truth con confianza BAJA exclusivamente para calibracion "
        "del modelo — el score alto es un falso positivo conocido.\n\n"
        "**Confianza**: Baja | **Patron**: Falso positivo — monopolio estatal legitimo",
        "false_positive",
    ),
    42876: (
        "## Investigacion: EQUIMED (VID 42876)\n\n"
        "**Riesgo**: 0.896 (Critico) | **Monto total**: 519.2M MXN | **Contratos**: 14 (2010-2012)\n\n"
        "### Hallazgos principales\n\n"
        "1. **Red de empresas Equimed**: Parte de una familia de proveedores — "
        "Equimed SA (3.7B, 444c), Equimed del Centro (6.0B, 160c), Equimed del Noreste (78M, 19c). "
        "Monto combinado estimado: 10.3B MXN.\n"
        "2. **Concentracion IMSS total**: 100% de contratos con IMSS.\n"
        "3. **64% adjudicacion directa**: Proporcion elevada para medicamentos.\n"
        "4. **Contratos duplicados sospechosos**: Tres contratos identicos de 19.2M MXN "
        "el mismo anio (2010) — posible fraccionamiento.\n"
        "5. **Sin RFC**: Imposibilita cruce con EFOS/SAT.\n\n"
        "### Evaluacion\n\n"
        "Proveedor farmaceutico con patron de concentracion IMSS y posible fraccionamiento "
        "de contratos. La existencia de multiples entidades Equimed sugiere una red "
        "de distribucion que amerita investigacion mas amplia. Los tres contratos "
        "identicos de 19.2M son una senal roja de threshold splitting.\n\n"
        "**Confianza**: Media | **Patron**: Monopolio concentrado + posible fraccionamiento",
        "reviewed",
    ),
    25847: (
        "## Investigacion: MEDICAMENTOS SELECTIVOS SA DE CV (VID 25847)\n\n"
        "**Riesgo**: 0.882 (Critico) | **Monto total**: 572.8M MXN | **Contratos**: 24 (2006-2013)\n\n"
        "### Hallazgos principales\n\n"
        "1. **ANOMALIA CRITICA DE SECTOR CRUZADO**: 557M MXN (97%) proviene de "
        "Pronosticos para la Asistencia Publica (agencia de loteria) por "
        "'servicios medicos integrales de hospitalizacion'.\n"
        "2. **Una agencia de loteria contratando hospitalizacion**: Pronosticos "
        "no tiene mandato de servicios de salud. Contratos de 372M (2013) y "
        "185M (2010) por adjudicacion directa para servicios medicos.\n"
        "3. **Perfil dual sospechoso**: Los otros 16M son compras legitimas de "
        "medicamentos en ISSSTE y CNR via licitacion publica.\n"
        "4. **Sin RFC**: No verificable en SAT/EFOS.\n\n"
        "### Evaluacion\n\n"
        "Caso altamente sospechoso. Una empresa farmaceutica que obtiene el 97% "
        "de sus ingresos de una agencia de loteria por servicios de hospitalizacion "
        "es una anomalia severa. Posible esquema de desvio de recursos: "
        "Pronosticos transfiere fondos a traves de contratos de servicios "
        "medicos ficticios. Se recomienda investigacion prioritaria "
        "de los contratos 2010 y 2013 con Pronosticos.\n\n"
        "**Confianza**: Media | **Patron**: Sobreprecio / desvio de recursos cross-sector",
        "reviewed",
    ),
}


def main():
    conn = sqlite3.connect(DB)
    c = conn.cursor()

    for vid, (memo, status) in MEMOS.items():
        c.execute(
            "UPDATE aria_queue SET memo_text=?, review_status=?, "
            "memo_generated_at=CURRENT_TIMESTAMP WHERE vendor_id=?",
            (memo, status, vid),
        )
        changed = c.execute("SELECT changes()").fetchone()[0]
        print(f"VID {vid}: {'updated' if changed else 'NOT FOUND in aria_queue'}")

    conn.commit()
    conn.close()


if __name__ == "__main__":
    main()

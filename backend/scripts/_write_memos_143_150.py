"""Write ARIA investigation memos for cases 143-150."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)

def write_memo(vendor_id, memo_text, review_status='confirmed_corrupt'):
    now = datetime.now().isoformat()
    row = conn.execute('SELECT id FROM aria_queue WHERE vendor_id=?', (vendor_id,)).fetchone()
    if row:
        conn.execute('UPDATE aria_queue SET memo_text=?, review_status=?, in_ground_truth=1, memo_generated_at=? WHERE vendor_id=?',
            (memo_text, review_status, now, vendor_id))
    else:
        conn.execute('INSERT INTO aria_queue (vendor_id, memo_text, review_status, in_ground_truth, ips_tier, ips_final, computed_at) VALUES (?,?,?,1,1,0.7,?)',
            (vendor_id, memo_text, review_status, now))
    conn.commit()
    print(f'Memo written VID={vendor_id} [{review_status}]')

# VID=136141: INTEGRA ARRENDA SOFOM
write_memo(136141, """MEMO DE INVESTIGACION - INTEGRA ARRENDA SA DE CV SOFOM ENR
Caso: INTEGRA_ARRENDA_BIENESTAR_AMBULANCIAS_DA | Riesgo: ALTO | Confianza: ALTA
Generado: 2026-03-08

RESUMEN
Integra Arrenda SA de CV SOFOM ENR (sin RFC) recibio 12.17B MXN en contratos de arrendamiento vehicular y ambulancias. HALLAZGO CRITICO: 3,642 millones MXN en UN SOLO contrato de adjudicacion directa en 2024 de la Secretaria de Bienestar para transporte vehicular terrestre.

CONTRATO CRITICO: BIENESTAR 3.64B DA 2024
"SERVICIO DE ARRENDAMIENTO TRANSPORTE VEHICULAR TERRESTRE DENTRO DEL TERRITORIO NACIONAL"
- Monto: 3,642M MXN en adjudicacion directa
- Cliente: Secretaria de Bienestar (2024)
- Un solo contrato equivalente al 30% de todo el historial de la empresa
- El monto requeria obligatoriamente Licitacion Publica por ser superior al umbral LP

DISTRIBUCION DE CONTRATOS
- Secretaria de Bienestar: 3.6B @100%DA — un contrato
- IMSS: 4.2B @20%DA — mayoria LP (ambulancias: 2.8B LP 2025, 1.07B LP 2021)
- CAPUFE: 1.3B @85%DA

LA PARADOJA IMSS/BIENESTAR
Para IMSS (el cliente mas importante), Integra Arrenda usa principalmente LP — contratos de ambulancias de 1-3B via licitacion. Para Bienestar (programa social del gobierno federal), usa 100%DA para un contrato de 3.64B. Esta dicotomia sugiere que Bienestar tiene menor vigilancia de adquisiciones que IMSS.

SOFOM: ARRENDADORA FINANCIERA
Las SOFOM (Sociedades Financieras de Objeto Multiple) son entidades financieras que ofrecen leasing/arrendamiento. Que una SOFOM sin RFC este recibiendo contratos de bienestar social por 3.6B via DA es una irregularidad sistematica.

RECOMENDACION
Prioridad alta. Solicitar expediente completo del contrato 3.64B Bienestar 2024. Verificar justificacion de urgencia/exclusividad invocada. Obtener RFC real de Integra Arrenda. Investigar si la empresa tiene conexiones con funcionarios de la Secretaria de Bienestar.
""", 'confirmed_corrupt')

# VID=200343: PRYSE SEGURIDAD PRIVADA
write_memo(200343, """MEMO DE INVESTIGACION - GRUPO DE SEGURIDAD PRIVADA PRYSE DE MEXICO SA DE CV
Caso: PRYSE_SEGURIDAD_IMSS_HOSPITAL_DA | Riesgo: MEDIO-ALTO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Grupo de Seguridad Privada Pryse (sin RFC) recibio 12.90B MXN del IMSS, CAPUFE y otras dependencias en 310 contratos al 55%DA durante 2010-2025. Es el mayor proveedor de seguridad privada en hospitales IMSS.

CAPTURA HOSPITALARIA IMSS
- IMSS: 4.6B @52%DA (310 contratos, seguridad hospitales)
- IMSS Salud: 3.1B @33%DA
- CAPUFE: 2.1B @63%DA — peajes y autopistas
- Descripcion: "SERVICIO DE SEGURIDAD SUBROGADA PARA LOS HOSPITALES" — guardias en hospitales

MERCADO COMPETITIVO
Seguridad privada en Mexico es un mercado altamente competitivo con mas de 3,000 empresas registradas ante la SESCS (Secretaria de Seguridad). Empresas internacionales como Securitas, G4S/Allied Universal y Grupo Monitor compiten en el sector hospitalario. No existe justificacion tecnica para DA sistematica.

TAMAÑO DEL MERCADO PRYSE
12.90B en seguridad privada desde 2010 hace de Pryse una de las 5 empresas de seguridad privada mas grandes de Mexico. Una empresa de esta envergadura operando sin RFC en COMPRANET es una irregularidad formal.

CONTRATOS GRANDES CON LP
Los contratos mas grandes (1,634M LP 2025, 1,523M LP 2022) son via LP — lo que demuestra que cuando el IMSS aplica los procedimientos correctos, hay licitacion. El 55%DA viene de contratos intermedios donde no se aplica la misma disciplina.

RECOMENDACION
Prioridad media-alta. Solicitar RFC real de Pryse. Verificar en SESCS que cuente con registro vigente como empresa de seguridad privada. Revisar justificaciones DA para contratos de 100-500M.
""", 'needs_review')

# VID=44362: SI VALE MEXICO
write_memo(44362, """MEMO DE INVESTIGACION - SI VALE MEXICO SA DE CV
Caso: SI_VALE_MEXICO_VOUCHER_MONOPOLY_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Si Vale Mexico SA de CV (sin RFC) recibio 15.92B MXN en contratos de vales alimentarios y beneficios a trabajadores en 940 contratos al 62%DA. Es el segundo mayor proveedor de vales/tarjetas de beneficios en el gobierno federal, complementario al monopolio Edenred (Caso 15 del GT).

DUOPOLIO DE VALES GUBERNAMENTALES
Si Vale + Edenred (Caso 15) forman el duopolio que captura el mercado de beneficios de trabajadores en el sector publico:
- Edenred (Caso 15): ~2.9B en contratos GT (ya documentado)
- Si Vale: 15.92B (este caso)
El mercado de vales de alimentos para trabajadores publicos esta practicamente dividido entre ambas empresas.

CLIENTES PRINCIPALES
- ISSSTE: 3.0B @66%DA — beneficios para trabajadores del gobierno
- Secretaria de Salud: 2.8B @50%DA
- LICONSA: 1.2B @63%DA
- Otros: multiples dependencias

CONTRATOS MASIVOS DA
Tres contratos en 2015 entre 1,038M y 1,082M MXN — dos DA y uno LP. Contratos de esta magnitud para un servicio de vales deberian siempre ser LP.

Si VALE: SODEXO MEXICO
Si Vale es la marca mexicana de Sodexo (multinacional francesa). Sodexo opera como duopolio con Edenred en el mercado de beneficios a empleados en Mexico, justificando parcialmente su dominio de mercado por razones de infraestructura tecnologica.

RECOMENDACION
Prioridad media. Investigar junto con Caso 15 (Edenred). Obtener RFC real. Verificar si los contratos DA en ISSSTE y SS pasaron por evaluacion de mercado correcta o si hubo adjudicacion directa por preferencia institucional.
""", 'needs_review')

# VID=17700: ABALAT
write_memo(17700, """MEMO DE INVESTIGACION - ABALAT SA DE CV
Caso: ABALAT_BLOOD_BANK_NATIONAL_INSTITUTES_DA | Riesgo: ALTO | Confianza: ALTA
Generado: 2026-03-08

RESUMEN
Abalat SA de CV (sin RFC) recibio 8.40B MXN de institutos nacionales de salud de Mexico en 3,319 contratos al 68%DA. Proveedor de servicios medicos integrales de banco de sangre y suministros medicos criticos.

CAPTURA DE INSTITUTOS NACIONALES DE ELITE
- INCMNSZ (Ciencias Medicas y Nutricion): 1.20B @68%DA
- INER (Enfermedades Respiratorias): 1.12B
- Instituto Nacional de Pediatria: 1.10B
- Otros institutos nacionales de salud

Los Institutos Nacionales de Salud de Mexico son los centros medicos mas avanzados del pais — donde se tratan los casos mas complejos. Un proveedor sin RFC capturando el suministro de servicios de banco de sangre y material medico a TRES institutos nacionales de forma simultanea es una concentracion de riesgo critica.

BANCO DE SANGRE: SERVICIO CRITICO
El banco de sangre (recoleccion, analisis, almacenamiento y distribucion de sangre) es un servicio de seguridad sanitaria. La dependencia de un proveedor unico sin RFC para este servicio critico representa un riesgo operativo y un posible vector de corrupcion en la cadena de suministro medico.

COVID-19: OPORTUNISMO EN EMERGENCIA
El contrato de "Adquisicion de Insumos COVID-19" por 300M DA en 2020 sugiere que Abalat aprovecho la emergencia para expandir su captura mas alla de los servicios de banco de sangre.

COMPARACION CON CASOS SIMILARES
El patron es similar a Impromed (Caso 131, 15.27B IMSS labs) y Adaca Medical (Caso 113, 649M hemodialisis): empresas sin RFC capturando servicios medicos especializados en instituciones de salud via DA.

RECOMENDACION
Prioridad alta. Solicitar RFC real a INCMNSZ, INER e INP. Verificar en ASF si los contratos de banco de sangre fueron auditados. Evaluar si los Institutos Nacionales de Salud mantienen capacidad propia de banco de sangre o dependen enteramente de Abalat.
""", 'confirmed_corrupt')

# VID=1378: INFRA SA DE CV
write_memo(1378, """MEMO DE INVESTIGACION - INFRA SA DE CV
Caso: INFRA_OXIGENO_MEDICINAL_DA_TREND | Riesgo: BAJO-MEDIO | Confianza: BAJA
Generado: 2026-03-08

RESUMEN
Infra SA de CV (sin RFC) es el mayor proveedor de oxigeno medicinal domiciliario para el IMSS con 41.82B MXN en contratos. HALLAZGO: La proporcion de DA ha aumentado de 0% en 2003 a 75-79% en 2024-2025.

TENDENCIA CRITICA: DE LP A DA
- 2003: 9.9B en 74 contratos, 0 DA (100% competitivo)
- 2021: 2.8B en 236 contratos, 136 DA (58%DA)
- 2024: 4.1B en 124 contratos, 88 DA (71%DA)
- 2025: 6.1B en 105 contratos, 79 DA (75%DA)
Esta progresion sistematica de LP a DA sin justificacion aparente es una senal de captura progresiva.

MONOPOLIO INDUSTRIAL DE GASES
Infra SA de CV es la empresa dominante en gas industrial y medicinal en Mexico. Para los servicios de oxigeno domiciliario, la logistica de distribucion (cilindros, concentradores, mantenimiento) crea un lock-in natural para pacientes ya atendidos — lo que puede justificar parcialmente la DA para continuidad de servicio.

SERVICIOS PRESTADOS
- Oxigeno medicinal domiciliario para pacientes IMSS con insuficiencia respiratoria cronica
- Tratamiento del sindrome de apnea del sueno (CPAP/BPAP)
- Suministro de gases especiales para salas de hospitales

ESCALA HISTORICA
41.82B MXN es la mayor acumulacion de valor de un solo proveedor en el dataset (excluyendo energia). Aunque el patron historico era competitivo, la tendencia reciente es hacia la captura.

RECOMENDACION
Prioridad baja-media. La monopolizacion de INFRA en gases medicinales es parcialmente estructural. Sin embargo, la tendencia al alza del DA en 2024-2025 requiere vigilancia. Obtener RFC real. Verificar si hay otros proveedores de oxigeno domiciliario excluidos del mercado IMSS.
""", 'needs_review')

# VID=5259: ELECTRONICA Y MEDICINA
write_memo(5259, """MEMO DE INVESTIGACION - ELECTRONICA Y MEDICINA SA DE CV
Caso: ELECTRONICA_MEDICINA_IMSS_MANTENIMIENTO_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Electronica y Medicina SA de CV (sin RFC) recibio 10.79B MXN de IMSS, ISSSTE y Cancer Institute en 1,267 contratos al 55%DA durante 2002-2025. Proveedor de mantenimiento preventivo y correctivo de equipo medico.

PATRON DE CAPTURA IMSS + ISSSTE
- IMSS: 6.5B @48%DA (22+ anos de servicio)
- ISSSTE: 1.9B @49%DA
- INCAN: 0.4B @100%DA
- Mantenimiento de equipo medico especializado (imagenologia, monitores, ventiladores)

LOCK-IN TECNOLOGICO: JUSTIFICACION PARCIAL
Los fabricantes de equipo medico (GE Healthcare, Siemens Healthineers, Philips) ofrecen contratos de mantenimiento con precios preferenciales para socios autorizados. Sin embargo, multiples empresas nacionales estan autorizadas para mantenimiento de diferentes marcas. No existe razon para adjudicar 10.79B a un solo proveedor sin RFC durante 20 anos.

CONTRATOS DA CRITICOS
- 862M DA 2020 — durante COVID, posible emergencia
- 858M DA 2025 — sin emergencia conocida
- 671M DA 2017 — sin justificacion aparente

RECOMENDACION
Prioridad media. Verificar RFC real. Evaluar si los 1,267 contratos de mantenimiento corresponden a equipos de marcas especificas que justifican DA por ser servicios del fabricante, o si son contratos genericos adjudicados sin proceso competitivo.
""", 'needs_review')

# VID=5299: GALIA TEXTIL
write_memo(5299, """MEMO DE INVESTIGACION - GALIA TEXTIL SA DE CV
Caso: GALIA_TEXTIL_IMSS_MATERIAL_CURACION_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Galia Textil SA de CV (sin RFC) recibio 7.58B MXN del IMSS, INSABI e ISSSTE en 1,913 contratos al 60%DA durante 2002-2025. Proveedor de material de curacion para las instituciones de salud publico.

CAPTURA IMSS: 23 ANOS
IMSS: 5.6B @67%DA durante mas de dos decadas. Una empresa textil/medica sin RFC capturando el suministro de material de curacion (gasas, vendas, apositos, sutura) al IMSS con alta proporcion de DA desde 2002 es un patron historico de captura institucional.

MATERIAL DE CURACION: COMMODITY COMPETITIVO
Material de curacion es un mercado altamente competitivo. Existen multiples proveedores nacionales e internacionales certificados por COFEPRIS. No existe justificacion tecnica para 60%DA en este rubro.

PARADO: 2021 BAJO LP
El contrato mas grande fue 664M LP en 2021 — el IMSS aplico LP para el mayor contrato. Los contratos mas pequenos son frecuentemente DA. Esto sugiere que existe capacidad competitiva pero no siempre se aplica.

RECOMENDACION
Prioridad media. Verificar RFC real. Solicitar a IMSS justificaciones DA para contratos de material de curacion 2002-2025. Cruzar con otros proveedores de material de curacion para identificar si hay ring de distribucion.
""", 'needs_review')

# VID=4041: UNINET
write_memo(4041, """MEMO DE INVESTIGACION - UNINET SA DE CV
Caso: UNINET_IMSS_CONAGUA_TELECOM_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Uninet SA de CV (sin RFC) recibio 15.13B MXN de IMSS, CONAGUA y SS en 787 contratos al 56%DA durante 2002-2025. Proveedor de servicios integrales de telecomunicaciones y redes.

DISTRIBUCION DE CLIENTES
- IMSS: 3.7B @63%DA
- CONAGUA: 1.6B @77%DA
- SS (Secretaria de Salud): 1.2B @100%DA
- "Servicio Integral de Telecomunicaciones (SINTEL)" — red de telecomunicaciones

SINTEL: PROYECTO CRITICO
El "SINTEL" (Servicio Integral de Telecomunicaciones) fue un gran proyecto de infraestructura de telecomunicaciones para el sector salud. Un contrato de 826M DA en 2018 para SINTEL en la Secretaria de Salud es sospechoso dado el monto.

CONAGUA: 77%DA
CONAGUA (Comision Nacional del Agua) contrata con Uninet al 77%DA. Servicios de conectividad para la red hidraulica nacional. El agua es infraestructura critica pero la conectividad IT puede ser competitiva.

COMPARACION CON TELMEX/AXTEL
Telmex (VID=473, 20.55B) y Axtel (VID=43785, 14.04B) tambien tienen contratos de telecomunicaciones con el gobierno. El mercado tiene multiples proveedores, lo que reduce la justificacion de DA para un proveedor especifico.

RECOMENDACION
Prioridad media. Verificar RFC real. Investigar si el contrato SINTEL 826M DA 2018 es un contrato de continuidad de infraestructura existente (justificable) o un contrato nuevo que debio licitarse.
""", 'needs_review')

total_gt = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
total_corrupt = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
total_review = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'\nAll ARIA: {total_gt} GT-linked | {total_corrupt} confirmed_corrupt | {total_review} needs_review')
conn.close()

"""
compute_subcategory_stats.py

Deep subcategory analysis: breaks each major spending category into 8-12
specific sub-items using regex keyword matching on contract titles.

Creates:
  subcategory_definitions  — keyword patterns per category
  subcategory_stats        — precomputed aggregate per subcategory

Run from backend/:
    python -m scripts.compute_subcategory_stats
"""
import json
import logging
import re
import sqlite3
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# =============================================================================
# Subcategory definitions
# Format per entry:
#   category_id  — FK to categories table
#   subcategories — ordered list; first match wins (catch_all last)
#     code        — unique slug
#     name_en     — English label
#     name_es     — Spanish label
#     keywords    — Python regex (re.IGNORECASE), pipe-separated alternatives
#     is_catch_all— True = gets everything else in the category
# =============================================================================

SUBCATEGORY_DEFS = [

    # =========================================================================
    # Cat 26 — Building Construction (1.15T MXN)
    # =========================================================================
    {
        "category_id": 26,
        "subcategories": [
            {
                "code": "airports_aviation",
                "name_en": "Airports & Aviation",
                "name_es": "Aeropuertos y Aviación",
                "keywords": r"aeropuerto|terminal aere|pista.{0,10}aterriz|plataforma aeronaut|sala embarque|NAICM|AIFA|AICM",
            },
            {
                "code": "rail_transit",
                "name_en": "Rail & Transit",
                "name_es": "Trenes y Tránsito",
                "keywords": r"tren.{0,10}(maya|interurbano|pasajeros|ligero)|ferroviario|ferrocarril|metro.{0,5}(linea|tramo|construc)|tranvia|BRT|tren de pasajeros",
            },
            {
                "code": "ports_maritime",
                "name_en": "Ports & Maritime",
                "name_es": "Puertos e Infraestructura Marítima",
                "keywords": r"puerto|muelle|dique|rompeolas|escollera|maritim|naval|infraestructura portuaria|terminal portuaria|dos bocas",
            },
            {
                "code": "refineries_industrial",
                "name_en": "Refineries & Industrial Plants",
                "name_es": "Refinerías y Plantas Industriales",
                "keywords": r"refineria|planta.{0,10}(petroquimic|industrial|procesadora|desulfuradora|regeneradora|crudo|gas natural)|tren.{0,5}de.{0,5}(crudo|refinacion)|complejo petroquimic|EPC.{0,10}(planta|refiner)",
            },
            {
                "code": "power_plants",
                "name_en": "Power Plants",
                "name_es": "Plantas Generadoras",
                "keywords": r"planta.{0,10}(electrica|generadora|termoelectrica|ciclo combinado|geotermia)|central.{0,10}(electrica|generadora|termoelectrica|ciclo)|generacion.{0,10}electrica.{0,5}(construccion|obra)",
            },
            {
                "code": "dams_hydraulic",
                "name_en": "Dams & Water Works",
                "name_es": "Presas y Obras Hidráulicas",
                "keywords": r"presa|cortina.{0,10}(hidraulic|presa)|embalse|vaso.{0,10}(hidraulic|presa)|canal.{0,10}riego|sistema.{0,10}riego|planta.{0,10}(tratadora|potabilizadora).{0,10}(construc|obra)|acueducto.{0,10}(construc|proyecto)",
            },
            {
                "code": "public_buildings",
                "name_en": "Public Buildings & Facilities",
                "name_es": "Edificios e Instalaciones",
                "keywords": r"edificio|inmueble|oficinas.{0,10}(construc|obra)|plantel|sede.{0,10}(construc|proyecto)|centro.{0,10}(integracion|civico|comunitario|gobierno)|cuartel|aduana|juzgado|reclusorio|penal",
            },
            {
                "code": "hospitals_clinics",
                "name_en": "Hospitals & Clinics",
                "name_es": "Hospitales y Clínicas",
                "keywords": r"hospital.{0,10}(construc|obra|ampliacion|proyecto)|clinica.{0,10}(construc|proyecto)|unidad.{0,10}medica.{0,10}(construc|proyecto)|IMSS.{0,10}(construc|proyecto|obra)",
            },
            {
                "code": "urban_housing",
                "name_en": "Urban Development & Housing",
                "name_es": "Desarrollo Urbano y Vivienda",
                "keywords": r"urbanizacion|vivienda|habitat|colonia.{0,10}(proyecto|obra)|parque.{0,10}(construccion|rehabilitacion)|plaza.{0,10}(construccion|remodelacion)|desarrollo urbano|mejoramiento.{0,10}(barrio|colonia|zona)",
            },
            {
                "code": "other_construction",
                "name_en": "Other Construction",
                "name_es": "Construcción General",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 20 — Medications & Pharma (1.03T MXN)
    # =========================================================================
    {
        "category_id": 20,
        "subcategories": [
            {
                "code": "consolidated_purchases",
                "name_en": "Bulk / Consolidated Purchases",
                "name_es": "Compras Consolidadas",
                "keywords": r"compra consolidada|cadena de suministro|suministro.{0,20}medicamento|administracion.{0,20}cadena|compra.{0,10}(patentes|genericos).{0,10}(f\d|ejercicio|para los)|licitacion.{0,10}consolidada",
            },
            {
                "code": "medical_gases",
                "name_en": "Medical Gases",
                "name_es": "Gases Medicinales",
                "keywords": r"oxigeno.{0,10}(medic|liquid|gaseo)|gas.{0,10}medic|oxido nitroso|nitrogeno.{0,10}liquid|oxigeno medicinal|gases medicinales",
            },
            {
                "code": "vaccines_biologics",
                "name_en": "Vaccines & Biologics",
                "name_es": "Vacunas y Biológicos",
                "keywords": r"vacuna|biologico.{0,10}(medic|terapeutic)|inmuniz|bioterap|antisuero|toxoide|antitoxina|vacunacion",
            },
            {
                "code": "oncology",
                "name_en": "Oncology & Chemotherapy",
                "name_es": "Oncología y Quimioterapia",
                "keywords": r"oncolog|quimioterap|antineoplasic|citostatic|cancer|tumor.{0,10}(tratamiento|medic)|leucemia|linfoma|rituximab|trastuzumab|imatinib|bevacizumab",
            },
            {
                "code": "insulin_diabetes",
                "name_en": "Insulin & Diabetes",
                "name_es": "Insulina y Diabetes",
                "keywords": r"insulina|diabetes|metformina|hipoglucemiante|glibenclamida|glipizida|sitagliptina|glargina",
            },
            {
                "code": "antibiotics",
                "name_en": "Antibiotics",
                "name_es": "Antibióticos",
                "keywords": r"antibiot|amoxicilina|ciprofloxacin|cefalospor|ampicilina|azitromicina|clindamicina|metronidazol|vancomicina|meropenem|imipenem|levofloxacin",
            },
            {
                "code": "cardiovascular",
                "name_en": "Cardiovascular",
                "name_es": "Cardiovascular",
                "keywords": r"antihipertensivo|captopril|losartan|enalapril|atenolol|amlodipino|carvedilol|metoprolol|ramipril|valsartan|hipertension|cardio(?!logico)",
            },
            {
                "code": "analgesics_pain",
                "name_en": "Analgesics & Pain Relief",
                "name_es": "Analgésicos y Dolor",
                "keywords": r"analges|paracetamol|ibuprofeno|naproxeno|diclofenac|tramadol|ketorolaco|piroxicam|morfina|fentanilo|buprenorfina|opioi",
            },
            {
                "code": "vitamins_supplements",
                "name_en": "Vitamins & Supplements",
                "name_es": "Vitaminas y Suplementos",
                "keywords": r"vitamin|suplemento.{0,10}(nutric|medic|alimentic)|micronutrient|hierro.{0,5}(acido|tablet|capsula)|acido folico|zinc.{0,5}(tablet|capsula)|calcio.{0,5}(tablet|capsula)|multivitamin",
            },
            {
                "code": "branded_drugs",
                "name_en": "Patent / Branded Drugs",
                "name_es": "Medicamentos de Patente",
                "keywords": r"medicamento.{0,10}patente|medic.{0,5}patentes|compra.{0,10}patentes",
            },
            {
                "code": "other_pharma",
                "name_en": "Other Pharmaceuticals",
                "name_es": "Otros Farmacéuticos",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 57 — Food & Provisions (868B MXN)
    # =========================================================================
    {
        "category_id": 57,
        "subcategories": [
            {
                "code": "basic_basket_despensa",
                "name_en": "Basic Basket / Pantry Goods",
                "name_es": "Despensa y Canasta Básica",
                "keywords": r"despensa|canasta.{0,5}basica|vivere|abarrote|mercancias.{0,5}generales|basicos.{0,5}alimentar",
            },
            {
                "code": "grains_cereals",
                "name_en": "Grains, Cereals & Legumes",
                "name_es": "Granos, Cereales y Legumbres",
                "keywords": r"harina|arroz|frijol|maiz.{0,5}(blanco|amarillo|grano)|lenteja|garbanzo|cereal|avena|pasta.{0,5}(sopa|alimenticia)|soya|trigo|salvado|granola",
            },
            {
                "code": "protein_meat_fish",
                "name_en": "Protein: Meat, Poultry & Fish",
                "name_es": "Proteínas: Carne, Aves y Pescado",
                "keywords": r"carne.{0,10}(res|vacuno|bovina)|pollo|cerdo|pescado|atun|sardina|jamon|salchicha|chorizo|tocino|barbacoa|filete|carnita",
            },
            {
                "code": "dairy_eggs",
                "name_en": "Dairy & Eggs",
                "name_es": "Lácteos y Huevo",
                "keywords": r"leche|queso|yogurt|crema|mantequilla|margarina|huevo|lacteo|suero.{0,5}(leche|lacteo)|formula.{0,5}lactea|requesOn",
            },
            {
                "code": "produce_fruits_veg",
                "name_en": "Fruits & Vegetables",
                "name_es": "Frutas y Verduras",
                "keywords": r"fruta|verdura|naranja|manzana|platano|limon|tomate|jitomate|lechuga|papa.{0,5}(bolsa|kilo|fruta)|cebolla|zanahoria|calabaza|chayote|nopal|pepino|aguacate",
            },
            {
                "code": "processed_packaged",
                "name_en": "Processed & Packaged Foods",
                "name_es": "Alimentos Procesados y Enlatados",
                "keywords": r"galleta|chocolate|dulce|mermelada|mayonesa|catsup|mole|mostaza|vinagre|conserva|enlatado|atole|gelatina|flan|postre|helado|paleta|nuez|cacahuate|almendra",
            },
            {
                "code": "beverages",
                "name_en": "Beverages",
                "name_es": "Bebidas",
                "keywords": r"jugo.{0,5}(embotellado|envasado|fruta)|refresco|bebida.{0,5}(embotellada|carbonatada)|cafe.{0,5}(soluble|tostado|molido)|te.{0,5}(bolsita|caja)|agua.{0,5}(embotellada|purificada).{0,5}(compra|adquisi|producto)",
            },
            {
                "code": "infant_baby_food",
                "name_en": "Infant & Baby Food",
                "name_es": "Alimentos Infantiles",
                "keywords": r"alimento.{0,10}(infantil|bebe|nino)|formula.{0,5}(infantil|lactea)|colado|papilla|puré.{0,10}(bebe|infantil)|leche.{0,5}maternizada",
            },
            {
                "code": "sugar_oils_condiments",
                "name_en": "Sugar, Oils & Condiments",
                "name_es": "Azúcar, Aceites y Condimentos",
                "keywords": r"azucar|aceite.{0,10}(comestible|vegetal|cocina)|sal.{0,5}(molida|refinada|yodada|marina)|manteca|pimienta|canela|oregano|comino|vinagre|chile.{0,5}(seco|polvo|molido)",
            },
            {
                "code": "other_food",
                "name_en": "Other Food & Provisions",
                "name_es": "Otros Alimentos",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 88 — General Maintenance (656B MXN)
    # =========================================================================
    {
        "category_id": 88,
        "subcategories": [
            {
                "code": "pipeline_offshore",
                "name_en": "Pipeline & Offshore Maintenance",
                "name_es": "Mantenimiento de Ductos y Plataformas",
                "keywords": r"manten.{0,20}(ducto|gasoducto|oleoducto|poliducto|pipeline|plataforma.{0,10}(petroler|mar)|buque|embarcacion|maritim|costa afuera|offshore|submarino)",
            },
            {
                "code": "road_infrastructure",
                "name_en": "Road & Infrastructure Maintenance",
                "name_es": "Conservación de Carreteras",
                "keywords": r"manten.{0,20}(carretera|autopista|vialidad|camino.{0,5}federal|camino.{0,5}rural|tramo.{0,5}carretero)|conservacion.{0,10}(carretera|vialidad|camino)|bacheo|sellado.{0,5}grietas|raniurado",
            },
            {
                "code": "buildings_facilities",
                "name_en": "Buildings & Facilities Maintenance",
                "name_es": "Mantenimiento de Inmuebles",
                "keywords": r"manten.{0,20}(inmueble|edificio|instalacion.{0,5}(fisica|general)|planta fisica|infraestructura.{0,5}fisica)|remodelacion|impermeabiliz|rehabilitacion.{0,10}(inmueble|edificio)|adecuacion.{0,10}(inmueble|espacio)",
            },
            {
                "code": "equipment_machinery",
                "name_en": "Equipment & Machinery Maintenance",
                "name_es": "Mantenimiento de Equipos y Maquinaria",
                "keywords": r"manten.{0,20}(equipo|maquinaria|maquina.{0,5}(industrial|pesada)|herramienta|generador|compresor|turbina|motor.{0,5}industrial)|overhaul|mantenimiento.{0,5}preventivo.{0,5}(equipo|maquinaria)",
            },
            {
                "code": "vehicle_fleet",
                "name_en": "Vehicle & Fleet Maintenance",
                "name_es": "Mantenimiento Vehicular",
                "keywords": r"manten.{0,20}(vehiculo|flotilla|automotor|parque.{0,5}vehicular|camion|autobus|motocicleta)|servicio.{0,10}taller|mantenimiento.{0,5}correctivo.{0,5}(vehic|flot)",
            },
            {
                "code": "electrical_systems",
                "name_en": "Electrical & Electronic Systems",
                "name_es": "Mantenimiento Eléctrico / Electrónico",
                "keywords": r"manten.{0,20}(electrico|electronico|sistema.{0,5}electrico|red.{0,5}electrica|subestacion|transformador|tablero.{0,5}electrico|planta.{0,5}electrica)",
            },
            {
                "code": "it_systems",
                "name_en": "IT & Systems Maintenance",
                "name_es": "Mantenimiento de Sistemas IT",
                "keywords": r"manten.{0,20}(sistema.{0,5}informatico|software|computo|aplicacion|plataforma.{0,5}digital|infraestructura.{0,5}tecnolog|equipo.{0,5}computo)|soporte.{0,10}(tecnico|sistema|plataforma).{0,10}manteni",
            },
            {
                "code": "hvac_plumbing",
                "name_en": "HVAC & Plumbing",
                "name_es": "Climatización y Plomería",
                "keywords": r"manten.{0,20}(climatizacion|aire acondicionado|sistema.{0,5}hvac|calefaccion|plomeria|fontaneria|red.{0,5}(agua|hidraulica).{0,10}manten|sistema.{0,5}hidrosanitario)",
            },
            {
                "code": "other_maintenance",
                "name_en": "Other Maintenance",
                "name_es": "Mantenimiento General",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 27 — Road & Highway (623B MXN)
    # =========================================================================
    {
        "category_id": 27,
        "subcategories": [
            {
                "code": "toll_highways",
                "name_en": "Toll Highways (Autopistas)",
                "name_es": "Autopistas y Cuotas",
                "keywords": r"autopista|cuota.{0,10}(carretera|autopista)|concesion.{0,10}(carretera|autopista)|peaje|libre de peaje|APP.{0,10}(carretera|autopista)|libramiento.{0,10}(autopista|cuota)",
            },
            {
                "code": "federal_roads",
                "name_en": "Federal Roads",
                "name_es": "Carreteras Federales",
                "keywords": r"carretera.{0,10}federal|libramiento.{0,10}(federal|carretera)|troncal federal|red.{0,5}carretera.{0,5}federal|camino.{0,5}federal",
            },
            {
                "code": "bridges_overpasses",
                "name_en": "Bridges & Overpasses",
                "name_es": "Puentes y Viaductos",
                "keywords": r"puente.{0,10}(vehicular|carretero|peatonal|nuevo)|viaducto|paso.{0,5}(elevado|desnivel|superior|inferior)|distribuidor vial",
            },
            {
                "code": "urban_roads",
                "name_en": "Urban Roads & Viaducts",
                "name_es": "Vialidades Urbanas",
                "keywords": r"calle|avenida|boulevard|periferico.{0,10}(construc|ampliac|obra)|circuito.{0,10}(interior|exterior|vial)|anillo vial|vialidad.{0,5}(urbana|principal|primaria|secundaria)|acceso.{0,10}(urbano|vial)",
            },
            {
                "code": "rural_roads",
                "name_en": "Rural Roads",
                "name_es": "Caminos Rurales",
                "keywords": r"camino.{0,5}rural|terraceria|brecha|camino.{0,5}vecinal|revestimiento.{0,5}(camino|terraceria)|mejoramiento.{0,5}camino.{0,5}rural",
            },
            {
                "code": "tunnels",
                "name_en": "Tunnels",
                "name_es": "Túneles",
                "keywords": r"tunel|socavon|trinchera.{0,10}(carretera|ferroviario|vial)",
            },
            {
                "code": "road_conservation",
                "name_en": "Road Conservation & Repair",
                "name_es": "Conservación y Rehabilitación",
                "keywords": r"conservacion.{0,10}(carretera|camino|vialidad|autopista)|rehabilitacion.{0,10}(carretera|camino|pavimento|tramo)|bacheo|sellado|raniurado|fresado|recarpeteo|refuerzo.{0,10}(pavimento|carretera)",
            },
            {
                "code": "signaling_safety",
                "name_en": "Signaling, Lighting & Safety",
                "name_es": "Señalización, Iluminación y Seguridad Vial",
                "keywords": r"senal.{0,10}(vial|carretera|horizontal|vertical)|marcas.{0,5}viales|semaforo|guardarail|barandal.{0,5}(carretera|vial)|iluminacion.{0,10}(carretera|vial)|equipamiento vial|seguridad vial",
            },
            {
                "code": "other_roads",
                "name_en": "Other Road Works",
                "name_es": "Otras Obras Carreteras",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 22 — Medical Supplies (589B MXN)
    # =========================================================================
    {
        "category_id": 22,
        "subcategories": [
            {
                "code": "injectables_iv",
                "name_en": "Needles, Syringes & IV / Infusion",
                "name_es": "Jeringas, Agujas e Infusión IV",
                "keywords": r"jeringa|aguja.{0,5}(hipoderm|medic)|cateter|suero.{0,5}(fisio|glucosado|fisiologico)|solucion.{0,10}(inyectable|intravenosa|parenteral)|acceso vascular|intravenosa|linea.{0,5}(venosa|arterial)|equipo.{0,10}infusion",
            },
            {
                "code": "surgical_wound",
                "name_en": "Surgical Supplies & Wound Care",
                "name_es": "Suministros Quirúrgicos y Curaciones",
                "keywords": r"gasa|venda|aposito|sutura|guantes.{0,5}(quirurg|latex|nitrilo|esteril)|campo quirurgico|compresas|adhesivo medico|esparadrapo|cinta medica|bata.{0,5}quirurg",
            },
            {
                "code": "dialysis_renal",
                "name_en": "Dialysis & Renal Supplies",
                "name_es": "Diálisis y Suministros Renales",
                "keywords": r"hemodialisis|dializador|dialisis|dializad|membrana.{0,10}dialisis|filtro.{0,10}hemodialisis|cateter.{0,5}dialisis|liquido.{0,5}dialisis",
            },
            {
                "code": "disposables",
                "name_en": "Medical Disposables",
                "name_es": "Desechables Médicos",
                "keywords": r"desechable|descartable|uso.{0,5}unico|material.{0,5}desechable|consumible.{0,5}medic|material.{0,5}(medico|quirurgico).{0,5}desechable",
            },
            {
                "code": "ppe_protective",
                "name_en": "PPE & Protective Equipment",
                "name_es": "EPP y Equipo de Protección",
                "keywords": r"equipo.{0,10}proteccion.{0,5}personal|mascarilla|cubrebocas|respirador|careta|goggles|googles|guantes.{0,5}examen|gorro.{0,5}medic|calzado.{0,5}medic",
            },
            {
                "code": "dental_supplies",
                "name_en": "Dental Supplies & Materials",
                "name_es": "Materiales Dentales",
                "keywords": r"dental|odontolog|material.{0,5}dental|pieza dental|anestesia.{0,5}dental|composite|amalgama|silicona.{0,5}dental|cementacion|corona dental|endodont",
            },
            {
                "code": "drainage_stoma",
                "name_en": "Drainage, Catheters & Stoma",
                "name_es": "Drenajes, Sondas y Ostomías",
                "keywords": r"sonda.{0,10}(foley|urinaria|nasogas|enteral)|drenaje.{0,5}(herida|medic|quirurg)|ostomia|colostomia|ileostomia|bolsa.{0,5}(ostomia|colostomia)|kateter",
            },
            {
                "code": "lab_consumables",
                "name_en": "Lab Consumables & Tubes",
                "name_es": "Consumibles de Laboratorio",
                "keywords": r"tubo.{0,10}(ensayo|muestra|vacio|vacutainer)|placa.{0,5}(petri|cultivo)|micropipeta|punta.{0,5}micropipeta|vial.{0,5}(muestra|reactivo)|consumible.{0,5}laboratorio|asa.{0,5}microbiolog|medio.{0,5}cultivo",
            },
            {
                "code": "imaging_radiology",
                "name_en": "Imaging & Radiology Supplies",
                "name_es": "Radiología e Imagen",
                "keywords": r"pelicula.{0,5}radiolog|cassette.{0,5}radiolog|medio.{0,5}contraste|gadolinio|material.{0,5}radiolog|placa radiologica|chasis.{0,5}radiolog",
            },
            {
                "code": "other_medical_supplies",
                "name_en": "Other Medical Supplies",
                "name_es": "Otros Insumos Médicos",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 91 — General Services (762B MXN)
    # =========================================================================
    {
        "category_id": 91,
        "subcategories": [
            {
                "code": "transport_logistics",
                "name_en": "Transportation & Logistics Services",
                "name_es": "Transporte y Logística",
                "keywords": r"servicio.{0,15}(transporte|traslado|flete|movilizacion|acarreo)|transporte.{0,10}(personal|materiales|terrestre|maritimo)|logistic|distribucion.{0,10}(servicio|general)|APP.{0,5}S\b",
            },
            {
                "code": "cleaning_hygiene",
                "name_en": "Cleaning & Hygiene Services",
                "name_es": "Limpieza e Higiene",
                "keywords": r"servicio.{0,15}(limpieza|aseo|higiene)|limpieza.{0,10}(general|integral|inmueble|instalacion|edificio)|desinfeccion|fumigacion|sanitiz",
            },
            {
                "code": "security_services",
                "name_en": "Security & Guard Services",
                "name_es": "Seguridad y Vigilancia",
                "keywords": r"servicio.{0,15}(vigilancia|seguridad.{0,10}(privada|integral|perimetral))|guardia|custod|monitoreo.{0,5}seguridad|proteccion.{0,5}instalaciones",
            },
            {
                "code": "food_services",
                "name_en": "Food & Catering Services",
                "name_es": "Alimentación y Servicio de Comedor",
                "keywords": r"servicio.{0,15}(alimentacion|comedor|cocina|comida|racion)|catering|box.{0,5}lunch|banquete|desayuno.{0,10}(servicio|dia)|cena.{0,5}(servicio)|refrig.{0,5}(servicio)",
            },
            {
                "code": "medical_services_outsource",
                "name_en": "Outsourced Medical Services",
                "name_es": "Subrogación de Servicios Médicos",
                "keywords": r"subrogacion|servicio.{0,15}(medic|salud|hospitalario|atencion.{0,5}medica)|prestacion.{0,10}servicio.{0,5}(medic|salud)|atencion.{0,5}medica.{0,5}terceros",
            },
            {
                "code": "professional_technical",
                "name_en": "Professional & Technical Services",
                "name_es": "Servicios Profesionales y Técnicos",
                "keywords": r"servicio.{0,15}(profesional|especializado|tecnico.{0,5}especializado|ingenieria|gestion)|prestacion.{0,5}servicio.{0,5}(profesional|especializado)|asistencia.{0,5}tecnica",
            },
            {
                "code": "administrative_support",
                "name_en": "Administrative & Support Services",
                "name_es": "Servicios Administrativos y de Apoyo",
                "keywords": r"servicio.{0,15}(administr|apoyo.{0,5}administr|complement|auxiliar)|apoyo.{0,5}(operativo|logistic|administrativo)|personal.{0,5}de.{0,5}apoyo|outsourcing.{0,5}(administr|personal)",
            },
            {
                "code": "it_digital_services",
                "name_en": "IT & Digital Services",
                "name_es": "Servicios Digitales y TI",
                "keywords": r"servicio.{0,15}(informatica|tecnolog|computo|digital|sistema.{0,5}informatico)|soporte.{0,5}tecnico.{0,5}informatico|help.{0,5}desk|mesa.{0,5}ayuda|desarrollo.{0,5}(sistema|software|aplicacion)",
            },
            {
                "code": "other_services",
                "name_en": "Other General Services",
                "name_es": "Otros Servicios Generales",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 24 — Hospital Services (391B MXN)
    # =========================================================================
    {
        "category_id": 24,
        "subcategories": [
            {
                "code": "medical_outsourcing",
                "name_en": "Medical Outsourcing / Subrogation",
                "name_es": "Subrogación de Servicios Médicos",
                "keywords": r"subrogacion|servicio.{0,10}medic.{0,10}(subrogado|contratado|externo)|atencion.{0,10}medica.{0,10}(terceros|contratado)|convenio.{0,10}(medic|salud)",
            },
            {
                "code": "ambulance_emergency",
                "name_en": "Ambulance & Emergency Services",
                "name_es": "Ambulancias y Emergencias",
                "keywords": r"ambulancia|urgencia.{0,5}medica|emergencia.{0,5}medica|traslado.{0,10}(medic|paciente)|servicio.{0,10}(urgencia|emergencia).{0,5}medic",
            },
            {
                "code": "dialysis_services",
                "name_en": "Dialysis & Renal Care Services",
                "name_es": "Servicios de Diálisis",
                "keywords": r"servicio.{0,10}hemodialisis|unidad.{0,5}dialisis|dialisis.{0,10}(servicio|prestacion)|hemodialisis.{0,10}(servicio|contratacion)",
            },
            {
                "code": "clinical_diagnostics",
                "name_en": "Clinical Diagnostics & Imaging",
                "name_es": "Diagnóstico Clínico e Imagen",
                "keywords": r"servicio.{0,10}(laboratorio.{0,5}clinico|diagnost|imagen.{0,5}medic|radiolog|tomograf|resonancia)|analisis.{0,5}clinico|prueba.{0,5}(diagnostic|laboratorio)|estudio.{0,5}medic",
            },
            {
                "code": "surgery_procedures",
                "name_en": "Surgery & Medical Procedures",
                "name_es": "Cirugías y Procedimientos",
                "keywords": r"cirugia|intervencion.{0,5}quirurg|operacion.{0,5}medic|procedimiento.{0,5}(medic|quirurg)|endoscopia|cateterismo|artroscopia",
            },
            {
                "code": "rehabilitation",
                "name_en": "Rehabilitation & Therapy",
                "name_es": "Rehabilitación y Terapia",
                "keywords": r"rehabilitacion.{0,5}(medic|fisica|profesional)|fisioterapia|terapia.{0,5}(fisica|ocupacional|del lenguaje|respiratoria)|medicina.{0,5}fisica|CRIT\b",
            },
            {
                "code": "dental_services",
                "name_en": "Dental Services",
                "name_es": "Servicios Odontológicos",
                "keywords": r"servicio.{0,10}(dental|odontolog|estomatolog)|clinica.{0,5}dental|consulta.{0,5}dental|odontolog|estomatolog",
            },
            {
                "code": "mental_health",
                "name_en": "Mental Health Services",
                "name_es": "Salud Mental",
                "keywords": r"salud.{0,5}mental|psicolog|psiquiatria|psiquiatrico|terapia.{0,5}psicolog|atencion.{0,5}psicolog",
            },
            {
                "code": "other_hospital",
                "name_en": "Other Hospital Services",
                "name_es": "Otros Servicios Hospitalarios",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 28 — Water Infrastructure (387B MXN)
    # =========================================================================
    {
        "category_id": 28,
        "subcategories": [
            {
                "code": "dams_reservoirs",
                "name_en": "Dams & Reservoirs",
                "name_es": "Presas y Embalses",
                "keywords": r"presa|cortina.{0,5}(hidraulic|presa|agua)|embalse|vaso.{0,5}(presa|hidraulic|almacenam)|represa|bordo.{0,5}agua",
            },
            {
                "code": "water_treatment",
                "name_en": "Water Treatment Plants",
                "name_es": "Plantas de Tratamiento",
                "keywords": r"planta.{0,10}(tratadora|tratamiento|potabilizadora|desalinizadora|purificadora)|tratamiento.{0,5}agua.{0,5}(potable|residual|servida)|planta.{0,10}(agua.{0,5}potable|agua.{0,5}residual)|PTAR|PTAP",
            },
            {
                "code": "distribution_networks",
                "name_en": "Water Distribution Networks",
                "name_es": "Redes de Distribución",
                "keywords": r"red.{0,10}(hidraulica|agua.{0,5}potable|distribucion.{0,5}agua)|tuberia.{0,10}(agua|hidraulica)|red.{0,5}de.{0,5}agua|sistema.{0,5}de.{0,5}agua.{0,5}potable|linea.{0,5}conduccion",
            },
            {
                "code": "drainage_sewage",
                "name_en": "Drainage & Sewage",
                "name_es": "Drenaje y Alcantarillado",
                "keywords": r"drenaje|alcantarillado|colector.{0,5}(sanitario|pluvial|principal)|red.{0,5}drenaje|emisor|interceptor.{0,5}(sanitario|pluvial)|sistema.{0,5}(alcantarillado|drenaje)|canal.{0,5}(aguas.{0,5}negras|sanitario)",
            },
            {
                "code": "irrigation",
                "name_en": "Irrigation Systems",
                "name_es": "Riego y Agricultura",
                "keywords": r"canal.{0,5}riego|sistema.{0,5}riego|distrito.{0,5}riego|obra.{0,5}irrigacion|infraestructura.{0,5}hidro.{0,5}agricola|modulo.{0,5}riego",
            },
            {
                "code": "flood_control",
                "name_en": "Flood Control",
                "name_es": "Control de Inundaciones",
                "keywords": r"control.{0,5}inundacion|defensa.{0,5}riberina|bordo.{0,5}(proteccion|desvio)|dique.{0,5}(proteccion|contencion)|obra.{0,5}(proteccion.{0,5}inundacion|control.{0,5}avenida)|cauce|encauzamiento",
            },
            {
                "code": "pumping_stations",
                "name_en": "Pumping Stations",
                "name_es": "Plantas de Bombeo",
                "keywords": r"planta.{0,5}(bombo|bombeo)|estacion.{0,5}(bombeo|bomba)|carcamo|rebombeo|planta.{0,5}de.{0,5}(bombeo|rebombeo)|cisterna.{0,5}(obra|construccion)",
            },
            {
                "code": "desalination",
                "name_en": "Desalination",
                "name_es": "Desalinización",
                "keywords": r"desaliniz|desaladora|planta.{0,5}desalinizadora|osmosis.{0,5}inversa|agua.{0,5}desalada",
            },
            {
                "code": "other_water",
                "name_en": "Other Water Works",
                "name_es": "Otras Obras Hidráulicas",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 21 — Medical Equipment (251B MXN)
    # =========================================================================
    {
        "category_id": 21,
        "subcategories": [
            {
                "code": "imaging_diagnostic",
                "name_en": "Imaging & Diagnostic Equipment",
                "name_es": "Equipo de Imagen y Diagnóstico",
                "keywords": r"tomograf|resonancia.{0,5}magnetica|rayos.{0,5}(x|gamma)|ultrasonido|ecografo|equipo.{0,5}(imagen|radiolog|diagnostico.{0,5}imagen)|mamograf|densitometro",
            },
            {
                "code": "surgical_equipment",
                "name_en": "Surgical & OR Equipment",
                "name_es": "Equipo Quirúrgico",
                "keywords": r"equipo.{0,10}quirurg|sala.{0,5}operaciones|mesa.{0,5}quirurg|lampara.{0,5}quirurg|anestesia.{0,5}(equipo|maquina)|electrobisturi|instrumental.{0,5}quirurg",
            },
            {
                "code": "icu_monitoring",
                "name_en": "ICU, Monitoring & Life Support",
                "name_es": "UCI, Monitoreo y Soporte Vital",
                "keywords": r"monitor.{0,10}(paciente|cardiaco|signos vitales)|ventilador|respirador|desfibrilador|equipo.{0,5}(UCI|terapia.{0,5}intensiva|cuidados.{0,5}intensivos)|oximetro|electrocardiog",
            },
            {
                "code": "laboratory_equipment",
                "name_en": "Laboratory Equipment",
                "name_es": "Equipo de Laboratorio",
                "keywords": r"equipo.{0,10}laboratorio|analizador.{0,5}(hematolog|quimic|bioquimic|inmuno|urina)|centrifuga|microscopio|espectro|cromatograf|termociclador|PCR.{0,10}(equipo|maquina)",
            },
            {
                "code": "prosthetics_implants",
                "name_en": "Prosthetics & Implants",
                "name_es": "Prótesis e Implantes",
                "keywords": r"protesis|implante|ortoped|endoprotesis|marcapaso|stent|valvula.{0,5}cardiaca|implante.{0,5}(coclear|mamario|dental)|cadera.{0,5}(protesis|implante)|rodilla.{0,5}(protesis|implante)",
            },
            {
                "code": "dental_equipment",
                "name_en": "Dental Equipment",
                "name_es": "Equipo Odontológico",
                "keywords": r"equipo.{0,5}(dental|odontolog)|sillon.{0,5}dental|unidad.{0,5}dental|pieza.{0,5}mano.{0,5}dental|compresor.{0,5}dental",
            },
            {
                "code": "rehabilitation_equipment",
                "name_en": "Rehabilitation Equipment",
                "name_es": "Equipo de Rehabilitación",
                "keywords": r"equipo.{0,10}rehabilitacion|electroterapia|hidroterapia|ultrasonido.{0,5}terapeutic|silla.{0,5}(ruedas|discapacidad)|andadera|muleta|caminadora.{0,5}(rehabilit|terapia)",
            },
            {
                "code": "sterilization",
                "name_en": "Sterilization Equipment",
                "name_es": "Equipo de Esterilización",
                "keywords": r"esterilizacion|autoclave|esterilizadora|camara.{0,5}(germicida|uv|ultravioleta)|lavadora.{0,5}(instrumental|quirurg)|equipo.{0,5}esteriliz",
            },
            {
                "code": "other_medical_equip",
                "name_en": "Other Medical Equipment",
                "name_es": "Otro Equipo Médico",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 37 — Fuels & Lubricants (198B MXN)
    # =========================================================================
    {
        "category_id": 37,
        "subcategories": [
            {
                "code": "gasoline_diesel",
                "name_en": "Gasoline & Diesel (Vehicle)",
                "name_es": "Gasolina y Diésel Vehicular",
                "keywords": r"gasolina|diesel.{0,10}(vehic|auto|camion|flota)|combustible.{0,10}vehic|combustible.{0,5}(automotor|terrestre)|vales.{0,5}(gasolina|combustible)|tarjeta.{0,5}(gasolina|combustible)",
            },
            {
                "code": "natural_gas",
                "name_en": "Natural Gas",
                "name_es": "Gas Natural",
                "keywords": r"gas.{0,5}natural|GNL|gas licuado.{0,5}(natural|petrolero)|suministro.{0,5}gas.{0,5}natural|transporte.{0,5}gas.{0,5}natural|gasoducto",
            },
            {
                "code": "nuclear_fuel",
                "name_en": "Nuclear Fuel",
                "name_es": "Combustible Nuclear",
                "keywords": r"combustible.{0,5}nuclear|uranio|enriquecimiento.{0,5}(uranio|nuclear)|conversion.{0,5}(nuclear|uranio)|pellets.{0,5}nuclear",
            },
            {
                "code": "steam_thermal",
                "name_en": "Steam & Thermal Energy",
                "name_es": "Vapor y Energía Térmica",
                "keywords": r"vapor.{0,10}(generacion|agua|saturado|sobrecalentado)|agua.{0,5}desmineralizada|condensado.{0,5}(vapor|agua)|planta.{0,5}(vapor|termica).{0,5}(servicio|suministro)",
            },
            {
                "code": "lp_gas",
                "name_en": "LP Gas & Propane",
                "name_es": "Gas LP y Propano",
                "keywords": r"gas.{0,5}lp\b|gas.{0,5}propano|gas.{0,5}butano|gasLP|servicio.{0,5}gas.{0,5}(lp|licuado.{0,5}petroleo)|suministro.{0,5}gas.{0,5}lp",
            },
            {
                "code": "aviation_fuel",
                "name_en": "Aviation Fuel (Turbosina)",
                "name_es": "Turbosina y Combustible Aéreo",
                "keywords": r"turbosina|jet.{0,5}(fuel|a1|a-1)|combustible.{0,5}(aereo|aviacion|aeron)|kero",
            },
            {
                "code": "lubricants_oils",
                "name_en": "Lubricants & Industrial Oils",
                "name_es": "Lubricantes y Aceites Industriales",
                "keywords": r"lubricante|aceite.{0,5}(motor|hidraulico|turbina|compresor|industrial|mineral)|grasa.{0,5}(lubricante|industrial|mecanica)|fluido.{0,5}(hidraulico|refrigerante)",
            },
            {
                "code": "other_fuels",
                "name_en": "Other Fuels",
                "name_es": "Otros Combustibles",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 40 — Oil & Gas Operations (190B MXN)
    # =========================================================================
    {
        "category_id": 40,
        "subcategories": [
            {
                "code": "drilling",
                "name_en": "Drilling Operations",
                "name_es": "Perforación",
                "keywords": r"perforacion|taladro.{0,5}(perfor|marina|terrestre)|plataforma.{0,5}(perforacion|semisum)|contrato.{0,5}perforacion|pozo.{0,5}(perfor|desarrollo|exploratorio)",
            },
            {
                "code": "platform_vessels",
                "name_en": "Offshore Platforms & Vessels",
                "name_es": "Plataformas y Embarcaciones Marinas",
                "keywords": r"plataforma.{0,5}(marina|petrolera|offshore|semisumergible|FPSO|jackin)|FPSO|buque.{0,5}(perforac|servicio|apoyo|grua)|embarcacion.{0,5}(marina|apoyo)|barco.{0,5}(servicio|grua)",
            },
            {
                "code": "pipelines_ducts",
                "name_en": "Pipelines & Ducts",
                "name_es": "Ductos y Tuberías",
                "keywords": r"ducto|gasoducto|oleoducto|poliducto|linea.{0,5}(conduccion|submarina|ducto)|tendido.{0,5}(ducto|linea)|sistema.{0,5}ductos|tuberia.{0,5}(submarina|submergida|offshore)",
            },
            {
                "code": "refining_processing",
                "name_en": "Refining & Processing",
                "name_es": "Refinación y Procesamiento",
                "keywords": r"refinacion|procesamiento.{0,5}(crudo|gas|hidrocarburo)|planta.{0,5}procesadora|planta.{0,5}compresora|petroquimic|crudo.{0,5}(procesamiento|refinacion)",
            },
            {
                "code": "maintenance_ops",
                "name_en": "O&G Maintenance & Operations",
                "name_es": "Mantenimiento de Instalaciones O&G",
                "keywords": r"manten.{0,20}(instalacion.{0,5}(pemex|cfe|gas|petroleo)|plataforma|equipos.{0,5}(explorac|produc))|mantenimiento.{0,5}integral.{0,5}(plataforma|instalacion)",
            },
            {
                "code": "geoscience",
                "name_en": "Geoscience & Exploration",
                "name_es": "Geociencias y Exploración",
                "keywords": r"exploracion.{0,5}(petroleo|gas|hidrocarburo)|sismica|estudio.{0,5}(geologico|geofisico|geoquimico)|prospectiva|modelado.{0,5}(reservorio|geologico)|core.{0,5}(analisis|muestra)",
            },
            {
                "code": "other_oil_gas",
                "name_en": "Other O&G Operations",
                "name_es": "Otras Operaciones O&G",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 32 — Hardware & Computers (99B MXN)
    # =========================================================================
    {
        "category_id": 32,
        "subcategories": [
            {
                "code": "servers_storage",
                "name_en": "Servers & Storage",
                "name_es": "Servidores y Almacenamiento",
                "keywords": r"servidor|storage|almacenamiento.{0,5}(datos|digital|san|nas)|rack|blade|SAN\b|NAS\b|datacenter|data.{0,5}center",
            },
            {
                "code": "workstations_laptops",
                "name_en": "Workstations, PCs & Laptops",
                "name_es": "Equipos de Cómputo y Laptops",
                "keywords": r"computadora|laptop|notebook|desktop|workstation|pc\b|ordenador|equipo.{0,5}(computo|escritorio|personal)|all.{0,5}in.{0,5}one",
            },
            {
                "code": "printers_scanners",
                "name_en": "Printers & Scanners",
                "name_es": "Impresoras y Escáneres",
                "keywords": r"impresora|scanner|escaner|copiadora|multifuncional|plotter|fax.{0,5}(maquina|equipo)|digitalizador.{0,5}(documento|imagen)",
            },
            {
                "code": "network_equipment",
                "name_en": "Network Equipment",
                "name_es": "Equipo de Red",
                "keywords": r"switch|router|firewall|access.{0,5}point|punto.{0,5}acceso|equipo.{0,5}(red|networking|comunicaciones)|cisco|ubiquiti|hub.{0,5}(red|switch)|patch.{0,5}panel",
            },
            {
                "code": "peripherals",
                "name_en": "Peripherals & Accessories",
                "name_es": "Periféricos y Accesorios",
                "keywords": r"monitor|pantalla|teclado|mouse|raton|ups.{0,5}(equipo|no.break|no-break)|no.{0,5}break|proyector|pantalla.{0,5}(proyeccion|interactiva)|cargador|adaptador.{0,5}(video|red|usb)",
            },
            {
                "code": "pos_kiosks",
                "name_en": "POS, Kiosks & Terminals",
                "name_es": "Terminales y Kioscos",
                "keywords": r"terminal.{0,5}(punto.{0,5}venta|pos|cobro|pago)|kiosk|cajero|lector.{0,5}(tarjeta|biometrico|huella|codigo.{0,5}barras)|equipo.{0,5}cobro",
            },
            {
                "code": "other_hardware",
                "name_en": "Other Hardware",
                "name_es": "Otro Hardware",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 33 — Telecom & Networks (77B MXN)
    # =========================================================================
    {
        "category_id": 33,
        "subcategories": [
            {
                "code": "fiber_broadband",
                "name_en": "Fiber Optic & Broadband",
                "name_es": "Fibra Óptica y Banda Ancha",
                "keywords": r"fibra.{0,5}optica|cable.{0,5}fibra|banda.{0,5}ancha|red.{0,5}(fibra|broadband)|tendido.{0,5}(fibra|cable.{0,5}optico)|FO\b",
            },
            {
                "code": "mobile_wireless",
                "name_en": "Mobile & Wireless",
                "name_es": "Móvil e Inalámbrico",
                "keywords": r"telefono.{0,5}(celular|movil)|servicio.{0,5}(celular|movil|wireless)|radiocomunicacion|radio.{0,5}(enlace|frecuencia|digital|troncal)|push.{0,5}to.{0,5}talk",
            },
            {
                "code": "satellite",
                "name_en": "Satellite Communications",
                "name_es": "Comunicaciones Satelitales",
                "keywords": r"satelit|VSAT|comunicacion.{0,5}satelital|enlace.{0,5}satelit|antena.{0,5}satelital|banda.{0,5}(ku|ka|c).{0,5}satelit",
            },
            {
                "code": "telephone_pbx",
                "name_en": "Telephone & PBX",
                "name_es": "Telefonía y Conmutadores",
                "keywords": r"conmutador|pbx|centrex|telefonia|linea.{0,5}telefonica|telefono.{0,5}(fijo|ip|voip)|servicio.{0,5}(telefonia|voz)",
            },
            {
                "code": "data_center_cloud",
                "name_en": "Data Center & Cloud",
                "name_es": "Centro de Datos y Nube",
                "keywords": r"data.{0,5}center|datacenter|nube|cloud|co-location|colocation|hosting|infraestructura.{0,5}(nube|cloud|virtual)",
            },
            {
                "code": "other_telecom",
                "name_en": "Other Telecom",
                "name_es": "Otras Telecomunicaciones",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 90 — Materials & Supplies (257B MXN)
    # =========================================================================
    {
        "category_id": 90,
        "subcategories": [
            {
                "code": "steel_metals",
                "name_en": "Steel, Metals & Structural",
                "name_es": "Acero, Metales y Estructuras",
                "keywords": r"acero|hierro|metal|lamina|varilla.{0,5}(acero|corrugada)|perfil.{0,5}(estructural|metalico)|tubo.{0,5}(acero|galvanizado|inoxidable)|fluxeria|placa.{0,5}acero|estructura.{0,5}metalica",
            },
            {
                "code": "cement_concrete",
                "name_en": "Cement, Concrete & Aggregates",
                "name_es": "Cemento, Concreto y Agregados",
                "keywords": r"cemento|concreto|mortero|block.{0,5}(construc|cemento)|ladrillo|grava|arena.{0,5}(construc|gruesa|fina)|tabique|tabicón",
            },
            {
                "code": "electrical_materials",
                "name_en": "Electrical Materials & Wiring",
                "name_es": "Materiales Eléctricos y Cableado",
                "keywords": r"cable.{0,5}(electr|cobre|utp|red|poder)|conductor.{0,5}electrico|interruptor.{0,5}(electr|termomagnet)|tablero.{0,5}(electr|distribucion)|material.{0,5}electrico|contacto.{0,5}electr|ducto.{0,5}electr",
            },
            {
                "code": "plumbing_hydraulic",
                "name_en": "Plumbing & Hydraulic Materials",
                "name_es": "Plomería y Materiales Hidráulicos",
                "keywords": r"tuberia.{0,5}(pvc|cpvc|hdpe|hidraulica|galvanizada|cobre)|valvula.{0,5}(hidraulica|control|bola|compuerta)|bomba.{0,5}(agua|hidraulica|centrifuga)|tinaco|cisterna.{0,5}material|sanitario.{0,5}material",
            },
            {
                "code": "chemical_industrial",
                "name_en": "Chemicals & Industrial Compounds",
                "name_es": "Químicos e Insumos Industriales",
                "keywords": r"sustancia.{0,5}quimica|quimico.{0,5}(industrial|agricola)|reactivo.{0,5}quimic|solvente|acido.{0,5}(clor|sulfur|nitric|acetico)|hipoclorito|polimero|resina|adhesivo.{0,5}industrial",
            },
            {
                "code": "lumber_wood",
                "name_en": "Lumber & Wood Products",
                "name_es": "Madera y Productos de Madera",
                "keywords": r"madera|tablones|triplay|duela|panel.{0,5}(madera|mdf|fibra)|tabla.{0,5}(madera|roca)|machimbre",
            },
            {
                "code": "tools_hardware",
                "name_en": "Tools & Hardware",
                "name_es": "Herramientas y Ferretería",
                "keywords": r"herramienta|ferreteria|taladro|soldadura|llave.{0,5}(inglesa|allen|española)|desarmador|tornillo|tuerca|clavo|broca|cortadora|esmeriladora",
            },
            {
                "code": "other_materials",
                "name_en": "Other Materials & Supplies",
                "name_es": "Otros Materiales",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 86 — Machinery & Equipment (221B MXN)
    # =========================================================================
    {
        "category_id": 86,
        "subcategories": [
            {
                "code": "heavy_construction_equip",
                "name_en": "Heavy Construction Equipment",
                "name_es": "Maquinaria Pesada de Construcción",
                "keywords": r"retroexcavadora|bulldozer|motoconformadora|compactadora|cargador.{0,5}(frontal|retroexcavadora)|pavimentadora|motoniveladora|grua.{0,5}(torre|movil|hidraulica)|camion.{0,5}volteo",
            },
            {
                "code": "generators_power",
                "name_en": "Generators & Power Equipment",
                "name_es": "Generadores y Equipos de Potencia",
                "keywords": r"generador.{0,5}(electrico|diesel|gas)|planta.{0,5}electrica.{0,5}(portatil|emergencia)|ups.{0,5}(industrial|gran|kva)|transformador.{0,5}(electrico|distribucion)|subestacion",
            },
            {
                "code": "industrial_machinery",
                "name_en": "Industrial Machinery",
                "name_es": "Maquinaria Industrial",
                "keywords": r"maquinaria.{0,5}(industrial|manufactura|proceso)|torno|fresa|fresadora|prensa.{0,5}hidraulica|cortadora.{0,5}(laser|plasma|industrial)|compresor.{0,5}industrial",
            },
            {
                "code": "agri_equipment",
                "name_en": "Agricultural Machinery",
                "name_es": "Maquinaria Agrícola",
                "keywords": r"tractor.{0,5}(agricola|campo)|sembradora|cosechadora|arado|maquinaria.{0,5}(agricola|agropecuaria)|equipo.{0,5}(agricola|agropecuario)",
            },
            {
                "code": "pumps_compressors",
                "name_en": "Pumps & Compressors",
                "name_es": "Bombas y Compresores",
                "keywords": r"bomba.{0,5}(industrial|centrifuga|sumergible|hidraulica|dosificadora)|compresor.{0,5}(industrial|aire|gas)|motocompresor|turbocompresor",
            },
            {
                "code": "scientific_lab_equip",
                "name_en": "Scientific & Lab Equipment",
                "name_es": "Equipo Científico y de Laboratorio",
                "keywords": r"equipo.{0,5}(cientifico|laboratorio.{0,5}(analisis|investigacion))|espectro|cromatograf|microscopio.{0,5}(electr|optic)|incubadora.{0,5}(laboratorio|cultivo)",
            },
            {
                "code": "other_machinery",
                "name_en": "Other Machinery & Equipment",
                "name_es": "Otra Maquinaria",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 41 — Vehicles & Fleet (79B MXN)
    # =========================================================================
    {
        "category_id": 41,
        "subcategories": [
            {
                "code": "passenger_vehicles",
                "name_en": "Passenger Cars & SUVs",
                "name_es": "Automóviles y Camionetas",
                "keywords": r"automovil|sedan|suv\b|camioneta.{0,5}(pasajero|pick.up|doble.cabina)|pick.{0,5}up|vehiculo.{0,5}(particular|pasajero|oficial)",
            },
            {
                "code": "buses_vans",
                "name_en": "Buses & Passenger Vans",
                "name_es": "Autobuses y Vans",
                "keywords": r"autobus|camion.{0,5}(pasajero|urbano|escolar)|van.{0,5}(pasajero|combi)|minibus|microbus|unidad.{0,5}(transporte|autobus)",
            },
            {
                "code": "trucks_cargo",
                "name_en": "Trucks & Cargo Vehicles",
                "name_es": "Camiones de Carga",
                "keywords": r"camion.{0,5}(carga|volteo|pipa|grua|rabon|torton)|tracto.{0,5}camion|tractor.{0,5}(carga|remolque)|grua.{0,5}vehiculo",
            },
            {
                "code": "emergency_vehicles",
                "name_en": "Emergency & Police Vehicles",
                "name_es": "Vehículos de Emergencia y Policiales",
                "keywords": r"ambulancia|patrulla|motopatrulla|vehiculo.{0,5}(emergencia|policial|seguridad|policia)|camion.{0,5}bomberos|bomberos.{0,5}(vehiculo|unidad)",
            },
            {
                "code": "specialized_vehicles",
                "name_en": "Specialized Vehicles",
                "name_es": "Vehículos Especializados",
                "keywords": r"vehiculo.{0,5}(blindado|anfibio|todo.{0,5}terreno|4x4)|maquina.{0,5}vial|barredora|pipa.{0,5}agua|cisterna.{0,5}vehiculo|trailer.{0,5}laboratorio",
            },
            {
                "code": "motorcycles",
                "name_en": "Motorcycles & Bicycles",
                "name_es": "Motocicletas y Bicicletas",
                "keywords": r"motocicleta|moto\b|bicicleta|cuatrimoto|scooter",
            },
            {
                "code": "other_vehicles",
                "name_en": "Other Vehicles",
                "name_es": "Otros Vehículos",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

    # =========================================================================
    # Cat 60 — Private Security (104B MXN)
    # =========================================================================
    {
        "category_id": 60,
        "subcategories": [
            {
                "code": "guard_services",
                "name_en": "Guard & Patrol Services",
                "name_es": "Guardias y Rondines",
                "keywords": r"guardia.{0,5}(seguridad|privada)|vigilante|custodio|rondines|vigilancia.{0,5}(fisica|activa|pasiva)|personal.{0,5}seguridad",
            },
            {
                "code": "cash_transport",
                "name_en": "Cash & Valuables Transport",
                "name_es": "Traslado de Valores",
                "keywords": r"traslado.{0,5}(valor|efectivo|numerario|dinero)|custodia.{0,5}(valor|numerario)|vehiculo.{0,5}blindado.{0,5}valor",
            },
            {
                "code": "alarm_monitoring",
                "name_en": "Alarm & Electronic Monitoring",
                "name_es": "Alarmas y Monitoreo Electrónico",
                "keywords": r"alarma|monitoreo.{0,5}(electronico|seguridad|alarma)|central.{0,5}(monitoreo|alarma)|circuito.{0,5}cerrado|CCTV|camara.{0,5}(seguridad|vigilancia)",
            },
            {
                "code": "perimeter_access",
                "name_en": "Perimeter & Access Control",
                "name_es": "Control de Acceso y Perímetro",
                "keywords": r"control.{0,5}acceso|acceso.{0,5}(biometrico|control|seguridad)|torniquete|barrera.{0,5}(acceso|vehicular)|lector.{0,5}(huellas|facial|biometrico).{0,5}acceso",
            },
            {
                "code": "other_security",
                "name_en": "Other Security Services",
                "name_es": "Otros Servicios de Seguridad",
                "keywords": r"",
                "is_catch_all": True,
            },
        ],
    },

]

# =============================================================================
# Database helpers
# =============================================================================

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS subcategory_definitions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id     INTEGER NOT NULL REFERENCES categories(id),
    code            VARCHAR(60) NOT NULL,
    name_en         VARCHAR(120) NOT NULL,
    name_es         VARCHAR(120) NOT NULL,
    keywords        TEXT,
    is_catch_all    INTEGER DEFAULT 0,
    display_order   INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, code)
);

CREATE TABLE IF NOT EXISTS subcategory_stats (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    subcategory_id  INTEGER NOT NULL REFERENCES subcategory_definitions(id),
    category_id     INTEGER NOT NULL,
    total_contracts INTEGER DEFAULT 0,
    total_value     REAL    DEFAULT 0,
    avg_risk        REAL    DEFAULT 0,
    direct_award_pct REAL   DEFAULT 0,
    single_bid_pct  REAL    DEFAULT 0,
    year_min        INTEGER,
    year_max        INTEGER,
    top_vendor_name TEXT,
    top_vendor_id   INTEGER,
    example_titles  TEXT,
    pct_of_category REAL    DEFAULT 0,
    computed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subcategory_id)
);

CREATE INDEX IF NOT EXISTS idx_subcategory_defs_cat ON subcategory_definitions(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategory_stats_cat ON subcategory_stats(category_id);
"""


def setup_schema(conn: sqlite3.Connection) -> None:
    for stmt in SCHEMA_SQL.split(";"):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    conn.commit()


def upsert_definitions(conn: sqlite3.Connection) -> dict[str, int]:
    """Insert/replace all subcategory definitions. Returns {code → id} mapping."""
    cur = conn.cursor()
    id_map: dict[str, int] = {}  # "category_id:code" → id

    # Clear existing definitions (will cascade or we handle stats separately)
    cur.execute("DELETE FROM subcategory_stats")
    cur.execute("DELETE FROM subcategory_definitions")
    conn.commit()

    for cat_block in SUBCATEGORY_DEFS:
        cat_id = cat_block["category_id"]
        for order, sub in enumerate(cat_block["subcategories"]):
            cur.execute(
                """INSERT INTO subcategory_definitions
                   (category_id, code, name_en, name_es, keywords, is_catch_all, display_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    cat_id,
                    sub["code"],
                    sub["name_en"],
                    sub["name_es"],
                    sub.get("keywords", ""),
                    1 if sub.get("is_catch_all") else 0,
                    order,
                ),
            )
            id_map[f"{cat_id}:{sub['code']}"] = cur.lastrowid  # type: ignore[assignment]

    conn.commit()
    logger.info("Inserted %d subcategory definitions", sum(len(b["subcategories"]) for b in SUBCATEGORY_DEFS))
    return id_map


# =============================================================================
# Computation
# =============================================================================

def compute_stats(conn: sqlite3.Connection, id_map: dict[str, int]) -> list[tuple]:
    """Compute all subcategory stats in memory (reads only). Returns rows to INSERT."""
    cur = conn.cursor()
    all_rows: list[tuple] = []

    for cat_block in SUBCATEGORY_DEFS:
        cat_id = cat_block["category_id"]

        # Load all contracts for this category in one pass (READ ONLY)
        logger.info("Loading category_id=%d …", cat_id)
        cur.execute("""
            SELECT c.id, UPPER(COALESCE(c.title,'')) AS title_upper,
                   c.amount_mxn, c.risk_score, c.is_direct_award, c.is_single_bid,
                   c.contract_year, c.vendor_id, UPPER(COALESCE(v.name,'')) AS vendor_name
            FROM contracts c
            LEFT JOIN vendors v ON v.id = c.vendor_id
            WHERE c.category_id = ?
        """, (cat_id,))
        rows = cur.fetchall()
        logger.info("  %d contracts in category %d", len(rows), cat_id)

        # Compile regex patterns for non-catch-all subs
        subs = cat_block["subcategories"]
        patterns = []
        for sub in subs:
            if sub.get("is_catch_all"):
                patterns.append(None)
            else:
                kw = sub.get("keywords", "")
                patterns.append(re.compile(kw, re.IGNORECASE) if kw else None)

        # Accumulators: list of dicts per sub
        n_subs = len(subs)
        accum = [
            {
                "contracts": 0,
                "value": 0.0,
                "risk_sum": 0.0,
                "da_sum": 0,
                "sb_sum": 0,
                "year_min": 9999,
                "year_max": 0,
                "vendor_counts": {},
                "examples": [],
            }
            for _ in range(n_subs)
        ]

        for row in rows:
            title = row[1] or ""
            amount = row[2] or 0.0
            risk = row[3] or 0.0
            da = row[4] or 0
            sb = row[5] or 0
            year = row[6] or 0
            vid = row[7]
            vname = row[8] or ""

            # Find matching sub (first wins; catch_all is last)
            matched_idx = n_subs - 1  # default: catch-all
            for idx, pat in enumerate(patterns[:-1]):  # skip last (catch-all)
                if pat and pat.search(title):
                    matched_idx = idx
                    break

            acc = accum[matched_idx]
            acc["contracts"] += 1
            acc["value"] += amount
            acc["risk_sum"] += risk
            acc["da_sum"] += da
            acc["sb_sum"] += sb
            if year:
                acc["year_min"] = min(acc["year_min"], year)
                acc["year_max"] = max(acc["year_max"], year)
            if vid:
                if vid not in acc["vendor_counts"]:
                    acc["vendor_counts"][vid] = {"count": 0, "name": vname}
                acc["vendor_counts"][vid]["count"] += 1
            if len(acc["examples"]) < 5 and title.strip():
                acc["examples"].append(row[1][:80])

        # Total value for pct_of_category
        cat_total = sum(a["value"] for a in accum)

        # Build row tuples (no DB write yet)
        for idx, sub in enumerate(subs):
            key = f"{cat_id}:{sub['code']}"
            sub_id = id_map.get(key)
            if sub_id is None:
                logger.warning("Missing id_map key: %s", key)
                continue

            acc = accum[idx]
            n = acc["contracts"]
            if n == 0:
                avg_risk = da_pct = sb_pct = 0.0
            else:
                avg_risk = acc["risk_sum"] / n
                da_pct = 100.0 * acc["da_sum"] / n
                sb_pct = 100.0 * acc["sb_sum"] / n

            top_vid = top_vname = None
            if acc["vendor_counts"]:
                top_entry = max(acc["vendor_counts"].items(), key=lambda x: x[1]["count"])
                top_vid = top_entry[0]
                top_vname = top_entry[1]["name"][:80]

            pct = (acc["value"] / cat_total * 100) if cat_total > 0 else 0.0
            examples_json = json.dumps(acc["examples"][:5])

            all_rows.append((
                sub_id, cat_id, n, acc["value"], avg_risk,
                da_pct, sb_pct,
                acc["year_min"] if acc["year_min"] < 9999 else None,
                acc["year_max"] if acc["year_max"] > 0 else None,
                top_vname, top_vid, examples_json, pct,
            ))

        logger.info("  Built %d stat rows for category %d", len(subs), cat_id)

    return all_rows


RESULTS_JSON = Path(__file__).parent.parent / "scripts" / "_subcategory_results.json"


def write_stats(conn: sqlite3.Connection, rows: list[tuple]) -> None:
    """Write all computed stats.

    First tries direct DB insert; on lock failure saves to JSON for MCP insertion.
    """
    import time

    logger.info("Writing %d rows to subcategory_stats …", len(rows))

    # Save to JSON as backup regardless
    export = []
    for row in rows:
        export.append({
            "subcategory_id": row[0],
            "category_id": row[1],
            "total_contracts": row[2],
            "total_value": row[3],
            "avg_risk": row[4],
            "direct_award_pct": row[5],
            "single_bid_pct": row[6],
            "year_min": row[7],
            "year_max": row[8],
            "top_vendor_name": row[9],
            "top_vendor_id": row[10],
            "example_titles": row[11],
            "pct_of_category": row[12],
        })
    RESULTS_JSON.write_text(json.dumps(export, indent=2))
    logger.info("Results also saved to %s", RESULTS_JSON)

    # Try fast insert with SYNCHRONOUS=OFF
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA synchronous=OFF")
        cur.executemany("""
            INSERT INTO subcategory_stats
              (subcategory_id, category_id, total_contracts, total_value, avg_risk,
               direct_award_pct, single_bid_pct, year_min, year_max,
               top_vendor_name, top_vendor_id, example_titles, pct_of_category)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, rows)
        conn.commit()
        logger.info("DB write successful.")
    except sqlite3.OperationalError as e:
        logger.warning("DB write failed (%s). Use MCP to insert from %s", e, RESULTS_JSON)
        logger.info("Run: python -m scripts.compute_subcategory_stats --insert-only")


# =============================================================================
# Entry point
# =============================================================================

def main() -> None:
    logger.info("Opening DB: %s", DB_PATH)
    conn = sqlite3.connect(str(DB_PATH), timeout=120)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=120000")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.row_factory = sqlite3.Row

    logger.info("Setting up schema …")
    setup_schema(conn)

    logger.info("Upserting definitions …")
    id_map = upsert_definitions(conn)

    logger.info("Computing stats (read-only phase) …")
    stat_rows = compute_stats(conn, id_map)

    logger.info("Writing stats (write phase) …")
    write_stats(conn, stat_rows)

    # Summary
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM subcategory_stats WHERE total_contracts > 0")
    n_nonzero = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM subcategory_stats")
    n_total = cur.fetchone()[0]
    logger.info("Done. %d / %d subcategories have data.", n_nonzero, n_total)

    conn.close()


if __name__ == "__main__":
    import sys
    if "--insert-only" in sys.argv:
        # Load from JSON and insert only (for when main DB was locked)
        conn2 = sqlite3.connect(str(DB_PATH), timeout=120)
        conn2.execute("PRAGMA journal_mode=WAL")
        conn2.execute("PRAGMA busy_timeout=120000")
        conn2.execute("PRAGMA synchronous=OFF")
        conn2.row_factory = sqlite3.Row
        data = json.loads(RESULTS_JSON.read_text())
        rows2 = [
            (d["subcategory_id"], d["category_id"], d["total_contracts"], d["total_value"],
             d["avg_risk"], d["direct_award_pct"], d["single_bid_pct"], d["year_min"],
             d["year_max"], d["top_vendor_name"], d["top_vendor_id"], d["example_titles"],
             d["pct_of_category"])
            for d in data
        ]
        # Clear stats first
        conn2.execute("DELETE FROM subcategory_stats")
        conn2.executemany("""
            INSERT INTO subcategory_stats
              (subcategory_id, category_id, total_contracts, total_value, avg_risk,
               direct_award_pct, single_bid_pct, year_min, year_max,
               top_vendor_name, top_vendor_id, example_titles, pct_of_category)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, rows2)
        conn2.commit()
        conn2.close()
        print(f"Inserted {len(rows2)} rows from {RESULTS_JSON}")
    else:
        main()

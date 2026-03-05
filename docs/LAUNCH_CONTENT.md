# RUBLI Launch Content
> Copy-paste ready. All stats verified from project data.

---

## 1. One-Paragraph Description (English)

**Short (for Twitter bios, GitHub about, email signatures):**

RUBLI is an open-source platform that analyzes 3.1 million Mexican federal government contracts (2002–2025) using machine learning to detect corruption risk patterns. It covers ~$639 billion USD in public spending across 12 sectors, trained on 22 documented corruption scandals including Segalmex, IMSS ghost companies, and COVID-19 procurement fraud.

**Long (for emails, about pages, press releases):**

RUBLI (named after Yang Wen-li's historian from Legend of the Galactic Heroes) is a free, open-access platform that applies machine learning to the full history of Mexican federal procurement data from COMPRANET. It analyzes 3.1 million contracts worth approximately $639 billion USD across 12 government sectors from 2002 to 2025. Using a per-sector risk model trained on 22 documented corruption cases — including the Segalmex food fraud, IMSS ghost company networks, COVID-19 emergency procurement abuse, and the Odebrecht-PEMEX bribery — the platform flags 9% of contracts as high or critical risk, within OECD benchmarks. It is designed for journalists, researchers, NGOs, and citizens to investigate procurement patterns, track vendors, and identify irregularities in public spending.

---

## 2. One-Paragraph Description (Spanish)

**Corto:**

RUBLI es una plataforma de código abierto que analiza 3.1 millones de contratos del gobierno federal mexicano (2002–2025) usando un modelo entrenado con 22 casos documentados de corrupción para detectar patrones de riesgo. Cubre aproximadamente 9.5 billones de pesos en gasto público, incluyendo casos como Segalmex, las empresas fantasma del IMSS y las compras de emergencia por COVID-19.

**Largo:**

RUBLI es una plataforma gratuita y de acceso abierto que aplica inteligencia artificial al historial completo de contrataciones del gobierno federal mexicano registradas en COMPRANET. Analiza 3.1 millones de contratos por un valor aproximado de 9.5 billones de pesos en 12 sectores de la administración pública federal, desde 2002 hasta 2025. Mediante un modelo de riesgo por sector, entrenado con 22 casos documentados de corrupción —incluyendo el fraude en Segalmex, redes de empresas fantasma en el IMSS, los abusos en compras de emergencia por COVID-19 y el caso Odebrecht-PEMEX— la plataforma identifica el 9% de los contratos como de alto riesgo o riesgo crítico, dentro de los rangos recomendados por la OCDE. Está diseñada para periodistas, investigadores, organizaciones de la sociedad civil y ciudadanos que buscan investigar patrones en la contratación pública, rastrear proveedores e identificar irregularidades en el gasto gubernamental.

---

## 3. Hacker News "Show HN" Post

**Title:**
> Show HN: I built a corruption detection platform for 3.1M Mexican government contracts

**Body:**

I've spent the last few months building RUBLI, an open-source platform that analyzes the complete history of Mexican federal procurement data (COMPRANET, 2002–2025).

**What it does:**
- Analyzes 3.1M contracts worth ~$639B USD across 12 government sectors
- Detects 9% of contracts as high/critical corruption risk using a per-sector ML model
- Trained on 22 documented corruption scandals (Segalmex, IMSS ghost companies, COVID fraud, Odebrecht-PEMEX, etc.)
- Vendor network analysis, collusion detection, case library, sector risk profiles

**Technical stack:**
- Backend: Python + FastAPI + SQLite (3.1M rows, ~2.4GB)
- Frontend: React + TypeScript + Recharts + Framer Motion
- Risk model: PU-learning (Elkan & Noto 2008) + per-sector ElasticNet logistic regression
- Train AUC: 0.967 / Test AUC: 0.957 (temporal split — train ≤2020, test ≥2021)

**Why I built it:**
Mexico's COMPRANET database is public but nearly impossible to navigate for investigative journalists or civil society organizations. The raw data is 23 years of CSV files across 4 different schemas with no unified analysis layer.

**The challenge:**
Only ~0.1% of 2002–2010 contracts have vendor RFC identifiers, rising to 47% for 2023–2025. Most "known bad" cases come from a handful of large documented scandals, so the model is trained on the bias of what gets caught — not what exists. The Limitations page is honest about this.

**Repo:** [github.com/rodanaya/yangwenli]
**Live:** [your-url-here]

Feedback welcome, especially from anyone working in anti-corruption, procurement transparency, or public sector data.

---

## 4. Twitter/X Thread (Spanish — lead with a finding)

**Tweet 1 (hook):**
Analicé 3.1 millones de contratos del gobierno federal mexicano (2002–2025).

El 9% muestra señales de alto riesgo de corrupción.

Aquí lo que encontré 🧵

**Tweet 2:**
El sector salud concentra algunos de los contratos con mayor riesgo.

El IMSS aparece en múltiples casos documentados: redes de empresas fantasma, precios inflados, proveedores con tasas de adjudicación anómalas.

Y eso es solo lo que está documentado.

**Tweet 3:**
El problema más común: un solo proveedor se queda con el 100% de los contratos de una institución.

Esto se llama concentración de adjudicaciones. En sectores donde hay docenas de competidores posibles, es una señal de alerta.

**Tweet 4:**
También encontramos:
• Contratos adjudicados directamente sin licitación pública
• Proveedores que participan juntos en cientos de procedimientos pero nunca compiten entre sí
• Empresas cuyo giro comercial no coincide con el sector del contrato

**Tweet 5:**
El modelo fue entrenado con 22 casos reales de corrupción documentados:
→ Segalmex
→ Empresas fantasma del IMSS
→ Compras COVID-19
→ Odebrecht-PEMEX
→ La Estafa Maestra
→ Casa Blanca / Grupo Higa
...y más

**Tweet 6:**
Los datos son públicos. Vienen de COMPRANET, el sistema oficial de contrataciones.

El problema es que son 23 años de archivos CSV con 4 formatos distintos, sin análisis unificado.

Eso es lo que construí.

**Tweet 7:**
RUBLI es de acceso libre.

Puedes buscar cualquier proveedor, cualquier institución, cualquier sector.

Ver sus patrones de riesgo, sus redes de relaciones, sus casos documentados.

[link]

¿Eres periodista o investigador? Me interesa saber qué encuentras.

---

## 5. Email Pitch to Journalists/NGOs

**Subject:** Herramienta de análisis de contrataciones públicas — 3.1M contratos, acceso libre

Hola [nombre],

Te escribo porque [Animal Político / MCCI / IMCO] cubre temas de transparencia y gasto público, y creo que esta herramienta puede ser útil para tu trabajo.

Construí RUBLI, una plataforma de código abierto que analiza 23 años de contrataciones del gobierno federal mexicano (3.1 millones de contratos, ~9.5 billones de pesos). Usa aprendizaje automático para detectar patrones similares a los de casos documentados de corrupción como Segalmex, el IMSS y las compras COVID.

Lo que puede hacer:
- Buscar cualquier proveedor y ver su historial completo de contratos, concentración de mercado y nivel de riesgo
- Ver qué instituciones tienen las tasas más altas de adjudicación directa o licitación con un solo participante
- Explorar los 22 casos de corrupción documentados que sirvieron de base al modelo

Está disponible en: [URL]

Si tienes una investigación en curso y te sería útil explorar datos específicos, con gusto te ayudo a interpretar los resultados.

Saludos,
[Tu nombre]

---

## 6. GitHub README Badge Block

Add these to the top of README.md (replace URL placeholders):

```markdown
[![Live Platform](https://img.shields.io/badge/Platform-Live-brightgreen)](http://YOUR_IP)
[![3.1M Contracts](https://img.shields.io/badge/Contracts-3.1M-blue)](http://YOUR_IP)
[![AUC 0.957](https://img.shields.io/badge/Model_AUC-0.957-orange)](http://YOUR_IP/methodology)
[![License MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
```

---

## 7. Outreach List — Priority Order

| Priority | Organization | Contact | Language |
|----------|-------------|---------|----------|
| 1 | **Mexicanos Contra la Corrupción (MCCI)** | mcci.org.mx/contacto | ES |
| 2 | **Animal Político** | @AnimalPolitico on X / tips form | ES |
| 3 | **IMCO** | imco.org.mx | ES |
| 4 | **Transparencia Mexicana** | tm.org.mx | ES |
| 5 | **Open Contracting Partnership** | open-contracting.org/contact | EN |
| 6 | **Hacker News** | news.ycombinator.com/submit | EN |
| 7 | **CONNECTAS** (LatAm investigative journalism) | connectas.org | ES |
| 8 | **CIDE / ITAM** (academic) | Direct email to public policy researchers | ES |

---

*Generated for RUBLI launch — March 2026*

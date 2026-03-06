export interface MediaLink {
  title: string
  outlet: string
  url: string
  date?: string
  language: 'es' | 'en'
}

export const CASE_MEDIA_LINKS: Record<string, MediaLink[]> = {
  'estafa-maestra': [
    {
      title: 'La Estafa Maestra: Graduados en desaparecer dinero publico',
      outlet: 'Animal Politico',
      url: 'https://www.animalpolitico.com/estafa-maestra',
      date: '2017-09-05',
      language: 'es',
    },
    {
      title: 'La Estafa Maestra del gobierno federal',
      outlet: 'Animal Politico / MCCI',
      url: 'https://panel.animalpolitico.com/estafa-maestra/estafa-maestra-gobierno-contrata-empresas-fantasma.html',
      date: '2017-09-05',
      language: 'es',
    },
    {
      title: 'Estafa Maestra -- Premio Gabo 2018',
      outlet: 'Premio Gabriel Garcia Marquez',
      url: 'https://premioggm.org/trabajo/edicion/2018/cobertura/estafa-maestra/',
      date: '2018-01-01',
      language: 'es',
    },
    {
      title: 'FGR va contra 3 universidades por Estafa Maestra',
      outlet: 'Animal Politico',
      url: 'https://animalpolitico.com/2021/08/fgr-universidades-estafa-maestra-exrector',
      date: '2021-08-01',
      language: 'es',
    },
  ],
  'grupo-higa-casa-blanca': [
    {
      title: 'La casa blanca de Enrique Pena Nieto (investigacion especial)',
      outlet: 'Aristegui Noticias',
      url: 'https://aristeguinoticias.com/0911/mexico/la-casa-blanca-de-enrique-pena-nieto/',
      date: '2014-11-09',
      language: 'es',
    },
    {
      title: 'La casa blanca de Enrique Pena Nieto -- Premio Gabo 2015',
      outlet: 'Premio Gabriel Garcia Marquez',
      url: 'https://premioggm.org/trabajo/edicion/2015/cobertura/la-casa-blanca-de-enrique-pena-nieto/',
      date: '2015-01-01',
      language: 'es',
    },
    {
      title: 'La Casa Blanca, el escandalo de corrupcion que dio la puntilla al gobierno de Pena Nieto',
      outlet: 'Infobae',
      url: 'https://www.infobae.com/america/mexico/2020/07/10/la-casa-blanca-el-escandalo-de-corrupcion-que-dio-la-puntilla-al-gobierno-de-pena-nieto/',
      date: '2020-07-10',
      language: 'es',
    },
  ],
  'odebrecht-pemex-bribery': [
    {
      title: 'Que hizo Emilio Lozoya y de que lo acusan en el caso Odebrecht?',
      outlet: 'Expansion Politica',
      url: 'https://politica.expansion.mx/mexico/2024/02/21/que-hizo-emilio-lozoya-odebrecht',
      date: '2024-02-21',
      language: 'es',
    },
    {
      title: 'Odebrecht | Tablero de la Impunidad',
      outlet: 'MCCI',
      url: 'https://contralacorrupcion.mx/tablero-de-la-impunidad/odebrecht/',
      language: 'es',
    },
    {
      title: 'Emilio Lozoya y el caso Odebrecht',
      outlet: 'TOJIL',
      url: 'https://tojil.org/en/emilio-lozoya-y-el-caso-odebrecht/',
      language: 'es',
    },
    {
      title: 'Caso Odebrecht en Mexico',
      outlet: 'Wikipedia',
      url: 'https://es.wikipedia.org/wiki/Caso_Odebrecht_en_M%C3%A9xico',
      language: 'es',
    },
  ],
  'pemex-emilio-lozoya': [
    {
      title: 'SCJN deja firme primera sentencia contra Lozoya por acusaciones en caso Odebrecht',
      outlet: 'La Jornada',
      url: 'https://www.jornada.com.mx/noticia/2026/03/04/politica/scjn-deja-firme-primera-sentencia-contra-lozoya-por-acusaciones-en-caso-odebrecht',
      date: '2026-03-04',
      language: 'es',
    },
    {
      title: 'Un Tribunal federal ordena juicio contra exdirector de Pemex por caso Odebrecht',
      outlet: 'SinEmbargo',
      url: 'https://www.sinembargo.mx/4530254/un-tribunal-federal-ordena-juicio-contra-exdirector-de-pemex-por-caso-odebrecht/',
      date: '2024-01-01',
      language: 'es',
    },
    {
      title: 'Mexican Executive to Pay $219m to Avoid Graft Trial',
      outlet: 'OCCRP',
      url: 'https://www.occrp.org/en/news/mexican-executive-to-pay-219m-to-avoid-graft-trial',
      language: 'en',
    },
  ],
  'segalmex-food-distribution': [
    {
      title: 'SEGALMEX: the most significant corruption scheme facing Mexico\'s federal government',
      outlet: 'DLA Piper',
      url: 'https://www.dlapiper.com/en/insights/publications/global-anti-corruption-perspective/segalmex-the-most-significant-corruption-scheme-facing-mexicos-federal-government',
      language: 'en',
    },
    {
      title: 'Inside Segalmex\'s 15 Billion-Peso Embezzlement Scandal',
      outlet: 'Pulse News Mexico',
      url: 'https://pulsenewsmexico.com/2023/04/11/inside-segalmexs-15-billion-peso-embezzlement-scandal/',
      date: '2023-04-11',
      language: 'en',
    },
    {
      title: 'AMLO Cites Segalmex Fraud as \'Stain\' of Presidency',
      outlet: 'Pulse News Mexico',
      url: 'https://pulsenewsmexico.com/2024/07/26/amlo-cites-segalmex-fraud-as-stain-of-presidency/',
      date: '2024-07-26',
      language: 'en',
    },
    {
      title: '9 of 22 arrest warrants served in Segalmex corruption case',
      outlet: 'Mexico News Daily',
      url: 'https://mexiconewsdaily.com/news/warrants-served-segalmex-case/',
      language: 'en',
    },
  ],
  'oceanografia-pemex-fraud': [
    {
      title: 'Banamex defrauded of nearly $600 million (USD) by Pemex contractor',
      outlet: 'Justice in Mexico',
      url: 'https://justiceinmexico.org/banamex-defrauded-of-nearly-600-million-usd-by-pemex-contractor/',
      date: '2014-02-28',
      language: 'en',
    },
    {
      title: 'Oil Firm Accused of Fraud Points Finger at Citibank',
      outlet: 'Courthouse News Service',
      url: 'https://www.courthousenews.com/oil-firm-accused-fraud-points-finger-citibank/',
      language: 'en',
    },
    {
      title: 'Citigroup finds fraud at Mexico unit',
      outlet: 'CBC News',
      url: 'https://www.cbc.ca/news/business/citigroup-finds-fraud-at-mexico-unit-1.2555086',
      date: '2014-02-28',
      language: 'en',
    },
  ],
  'tren-maya-fonatur': [
    {
      title: 'Fonatur debe justificar $1,700 millones en anomalias del Tren Maya',
      outlet: 'MCCI',
      url: 'https://contralacorrupcion.mx/asf-exhibe-anomalias-por-1399-mdp-en-obras-del-tren-maya/',
      language: 'es',
    },
    {
      title: 'Improvisaciones, pagos indebidos, sobrecosto, lo que la ASF detecta en Tren Maya',
      outlet: 'Expansion',
      url: 'https://politica.expansion.mx/mexico/2024/02/24/improvisaciones-pagos-indebidos-sobrecosto-lo-que-la-asf-detecta-en-tren-maya',
      date: '2024-02-24',
      language: 'es',
    },
    {
      title: 'Claves sobre las irregularidades senaladas al Tren Maya por la ASF',
      outlet: 'Obras Expansion',
      url: 'https://obras.expansion.mx/infraestructura/2021/02/22/claves-sobre-irregularidades-senaladas-al-tren-maya-por-asf',
      date: '2021-02-22',
      language: 'es',
    },
    {
      title: 'ASF detecta pagos irregulares por poco mas de 2 mil mdp en Tren Maya',
      outlet: 'El Universal',
      url: 'https://www.eluniversal.com.mx/cartera/asf-detecta-pagos-irregulares-por-poco-mas-de-2-mil-mdp-en-tren-maya-encuentra-remuneraciones-por-aclarar-de-fonatur/',
      language: 'es',
    },
  ],
  'linea-12-metro-collapse': [
    {
      title: 'Linea de tiempo: La oscura historia de la Linea 12',
      outlet: 'MCCI',
      url: 'https://contralacorrupcion.mx/colapso-linea-12-metro/linea-de-tiempo-la-oscura-historia-de-la-linea-12/',
      language: 'es',
    },
    {
      title: 'Linea 12 | Tablero de la Impunidad',
      outlet: 'MCCI',
      url: 'https://contralacorrupcion.mx/tablero-de-la-impunidad/linea-12/',
      language: 'es',
    },
    {
      title: 'Que paso en la Linea 12 del Metro de CDMX? Tres anos despues',
      outlet: 'Infobae',
      url: 'https://www.infobae.com/mexico/2024/05/03/que-paso-en-la-linea-12-del-metro-de-cdmx-tres-anos-despues-de-la-tragedia-que-destruyo-familias/',
      date: '2024-05-03',
      language: 'es',
    },
    {
      title: 'The Collapsing of Line 12 of the Mexico City Metro',
      outlet: 'Harvard ReVista',
      url: 'https://revista.drclas.harvard.edu/the-collapsing-of-line-12-of-the-mexico-city-metro/',
      language: 'en',
    },
    {
      title: 'Caida de Linea 12 del Metro cumple cuatro anos; reparacion y sanciones siguen pendientes',
      outlet: 'Expansion Politica',
      url: 'https://politica.expansion.mx/cdmx/2025/05/03/caida-linea-12-metro-cumple-cuatro-anos',
      date: '2025-05-03',
      language: 'es',
    },
  ],
  'imss-ghost-company-network': [
    {
      title: 'Funcion Publica multo e inhabilito a farmaceuticas Pisa y Dimesa por falsear informacion',
      outlet: 'Infobae',
      url: 'https://www.infobae.com/america/mexico/2020/10/21/funcion-publica-multo-e-inhabilito-a-farmaceuticas-pisa-y-dimesa-por-falsear-informacion-en-contratacion-con-el-imss/',
      date: '2020-10-21',
      language: 'es',
    },
    {
      title: 'El caso de una farmaceutica en Mexico: fue criticada por AMLO, pero gano contratos con el IMSS por mas de 1,000 mdp',
      outlet: 'Infobae',
      url: 'https://www.infobae.com/america/mexico/2020/03/01/el-caso-de-una-farmaceutica-en-mexico-fue-criticada-por-amlo-pero-gano-contratos-con-el-imss-por-mas-de-1000-millones-de-pesos/',
      date: '2020-03-01',
      language: 'es',
    },
    {
      title: 'Salud mental: en manos de los autores del ultimo fraude por venta de insulina',
      outlet: 'PODER',
      url: 'https://poderlatam.org/en/2022/06/salud-mental-en-manos-de-los-autores-del-ultimo-fraude-por-venta-de-insulina/',
      date: '2022-06-01',
      language: 'es',
    },
  ],
  'fertinal-pemex-acquisition': [
    {
      title: 'Government\'s overpayment for fertilizer plants under the microscope',
      outlet: 'Mexico News Daily',
      url: 'https://mexiconewsdaily.com/news/purchase-of-fertilizer-plants-under-the-microscope/',
      language: 'en',
    },
    {
      title: 'Con AMLO continuaron los desfalcos de Fertinal y Agronitrogenados',
      outlet: 'Proceso',
      url: 'https://www.proceso.com.mx/nacional/2025/2/20/con-amlo-continuaron-los-desfalcos-de-fertinal-agronitrogenados-345984.html',
      date: '2025-02-20',
      language: 'es',
    },
    {
      title: 'Mexican Executive to Pay $219m to Avoid Graft Trial',
      outlet: 'OCCRP',
      url: 'https://www.occrp.org/en/news/mexican-executive-to-pay-219m-to-avoid-graft-trial',
      language: 'en',
    },
  ],
  'naicm-airport-texcoco': [
    {
      title: 'The New Mexico City International Airport',
      outlet: 'PODER',
      url: 'https://poderlatam.org/en/project/the-new-mexico-city-international-airport/',
      language: 'en',
    },
  ],
  'cisen-pegasus-surveillance': [
    {
      title: 'Reckless Exploit: Mexican Journalists, Lawyers, and a Child Targeted with NSO Spyware',
      outlet: 'Citizen Lab',
      url: 'https://citizenlab.ca/2017/06/reckless-exploit-mexico-nso/',
      date: '2017-06-19',
      language: 'en',
    },
    {
      title: 'New Pegasus Spyware Abuses Identified in Mexico',
      outlet: 'Citizen Lab',
      url: 'https://citizenlab.ca/2022/10/new-pegasus-spyware-abuses-identified-in-mexico/',
      date: '2022-10-01',
      language: 'en',
    },
    {
      title: 'Mexico says officials spent $61 million on Pegasus spyware',
      outlet: 'PBS News',
      url: 'https://www.pbs.org/newshour/world/mexico-says-officials-spent-61-million-on-pegasus-spyware',
      language: 'en',
    },
    {
      title: 'Massive data leak reveals Israeli NSO Group\'s spyware used to target activists, journalists, and political leaders globally',
      outlet: 'Amnesty International',
      url: 'https://www.amnesty.org/en/latest/press-release/2021/07/the-pegasus-project/',
      date: '2021-07-18',
      language: 'en',
    },
  ],
  'ahmsa-pemex-steel': [
    {
      title: 'Mexico freezes oil exec, steel accounts in corruption probe',
      outlet: 'Fox Business',
      url: 'https://www.foxbusiness.com/markets/mexico-freezes-oil-exec-steel-accounts-in-corruption-probe',
      language: 'en',
    },
    {
      title: 'Mexico Blocks Bank Accounts of Former Pemex CEO',
      outlet: 'OCCRP',
      url: 'https://www.occrp.org/en/news/mexico-blocks-bank-accounts-of-former-pemex-ceo',
      language: 'en',
    },
  ],
}

/**
 * contract-audit — shared forensic helpers for vendor contract sets.
 *
 * Ported from the /explore Z3 "EL EXPEDIENTE" register so the canonical dossier
 * can reuse the exact same classification. Two pieces:
 *   - cleanContractDescription: split a raw COMPRANET title into a readable
 *     {objeto, expediente}, stripping leading + embedded procurement codes.
 *   - computeContractFlags: per-contract red-flag signals over a contract set
 *     (repeated amount/object, single-bid, within-set top-decile, amendment,
 *     round-number) + a census summary.
 *
 * NOTE: flags are computed over WHATEVER set is passed (a page or a population).
 * Callers should label the scope honestly.
 */
import { shortenContractName } from '@/lib/utils'

export type ContractLike = {
  id: number
  amount_mxn?: number | null
  contract_year?: number | null
  is_direct_award?: boolean | number | null
  is_single_bid?: boolean | number | null
  title?: string | null
  procedure_type?: string | null
}

export function cleanContractDescription(raw: string): { objeto: string | null; expediente: string | null } {
  const s = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return { objeto: null, expediente: null }
  const tokens = s.split(' ')
  const core = (t: string) => t.replace(/^[^0-9a-záéíóúñü]+/i, '').replace(/[^0-9a-záéíóúñü]+$/i, '')
  const isWord = (t: string) => /^[a-záéíóúñü]{2,}$/i.test(core(t))
  const isCode = (t: string) => /\d/.test(t) && /[-/]/.test(t) && core(t).length >= 5
  let i = 0
  const codeParts: string[] = []
  while (i < tokens.length && !isWord(tokens[i])) { codeParts.push(tokens[i]); i++ }
  const objWords: string[] = []
  for (const t of tokens.slice(i)) { if (isCode(t)) codeParts.push(t); else objWords.push(t) }
  const objectRaw = objWords.join(' ').trim()
  const objeto = objectRaw ? shortenContractName(objectRaw, 90) : null
  const codeFirst = codeParts[0] ? codeParts[0].toUpperCase().slice(0, 28) : ''
  const expediente = codeFirst ? (codeParts.length > 1 ? `${codeFirst} …` : codeFirst) : null
  return { objeto, expediente }
}

export type ContractFlags = {
  repeated: boolean
  repeatAmt: number
  repeatObj: number
  singleBid: boolean
  decile: boolean
  amendment: boolean
  round: boolean
  count: number
}

export type ContractAudit = {
  info: Map<number, ContractFlags>
  census: {
    shown: number
    repeatedRows: number
    noCompetition: number
    peakAmt: number
    peakMult: number
    topObj: string
    topObjN: number
    yearCount: number
  }
}

const OBJ_STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'por', 'con', 'para', 'en', 'un', 'una', 'al', 'adquisicion', 'compra', 'adjudicacion', 'adq', 'conv', 'directa', 'mediante', 'contratacion', 'servicio', 'servicios', 'suministro', 'bien', 'bienes'])

export function computeContractFlags(contracts: ContractLike[]): ContractAudit {
  const valued = contracts.map((c) => Number(c.amount_mxn) || 0).filter((a) => a > 0).sort((a, b) => a - b)
  const decileThreshold = valued.length >= 10 ? (valued[Math.floor(valued.length * 0.9)] ?? Infinity) : Infinity

  const amtMap = new Map<number, number>()
  const objKey = (c: ContractLike) => {
    const o = cleanContractDescription(c.title ?? '').objeto
    if (!o) return ''
    const words = o.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !OBJ_STOP.has(w))
    return words.length ? words[0].slice(0, 5) : ''
  }
  const objCount = new Map<string, number>()
  const objLabel = new Map<string, string>()
  contracts.forEach((c) => {
    const a = Number(c.amount_mxn) || 0
    if (a > 0) { const k = Math.round(a / 100) * 100; amtMap.set(k, (amtMap.get(k) ?? 0) + 1) }
    const k = objKey(c)
    if (k) {
      objCount.set(k, (objCount.get(k) ?? 0) + 1)
      if (!objLabel.has(k)) objLabel.set(k, cleanContractDescription(c.title ?? '').objeto ?? '')
    }
  })
  const isRoundish = (a: number) => {
    if (a <= 0) return false
    if (a % 10000 === 0) return true
    const step = 50000
    const next = Math.ceil(a / step) * step
    return next > a && (next - a) / a <= 0.03
  }
  const amendRe = /modific|convenio/i
  const info = new Map<number, ContractFlags>()
  contracts.forEach((c) => {
    const a = Number(c.amount_mxn) || 0
    const repeatAmt = a > 0 ? (amtMap.get(Math.round(a / 100) * 100) ?? 0) : 0
    const k = objKey(c)
    const repeatObj = k ? (objCount.get(k) ?? 0) : 0
    const repeated = repeatAmt >= 3 || repeatObj >= 3
    const singleBid = !!c.is_single_bid
    const decile = a > 0 && a >= decileThreshold
    const amendment = amendRe.test(`${c.title ?? ''} ${c.procedure_type ?? ''}`)
    const round = isRoundish(a)
    const count = (repeated ? 1 : 0) + (singleBid ? 1 : 0) + (decile ? 1 : 0) + (amendment ? 1 : 0)
    info.set(c.id, { repeated, repeatAmt, repeatObj, singleBid, decile, amendment, round, count })
  })

  const repeatedRows = contracts.filter((c) => info.get(c.id)?.repeated).length
  const noCompetition = contracts.filter((c) => c.is_direct_award || c.is_single_bid).length
  let peakAmt = 0, peakMult = 0
  amtMap.forEach((n, k) => { if (n > peakMult) { peakMult = n; peakAmt = k } })
  let topKey = '', topObjN = 0
  objCount.forEach((n, k) => { if (n > topObjN) { topObjN = n; topKey = k } })
  const yearCount = new Set(contracts.map((c) => Number(c.contract_year)).filter(Boolean)).size

  return {
    info,
    census: { shown: contracts.length, repeatedRows, noCompetition, peakAmt, peakMult, topObj: objLabel.get(topKey) ?? '', topObjN, yearCount },
  }
}

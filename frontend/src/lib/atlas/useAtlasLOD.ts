/**
 * useAtlasLOD — Level-of-Detail descriptor for the Observatory telescope zoom.
 *
 * Maps the composed effective scale (`transform.s * userZoom`) onto one of
 * three semantic bands. The band drives how many vendor labels render, whether
 * risk chips appear, etc. This mirrors the standard map LOD pattern: zoom
 * thresholds expose progressively more detail without changing the underlying
 * data layer.
 *
 *   constellation   < 4×     — pure starfield, lattice only
 *   region        4..12×     — top 50% of vendors labeled (by risk desc)
 *   star          ≥ 12×      — every vendor labeled + risk % chip + contract count
 *
 * The dot-scale multiplier nudges radii up at deeper bands so dots stay
 * legible against the counter-scaled labels. Always keep dots visible —
 * the band only changes labels and chips, not the dot presence itself.
 */

import { useMemo } from 'react'

export type AtlasLODBand = 'constellation' | 'region' | 'star'

export interface AtlasLOD {
  band: AtlasLODBand
  /** Fraction of vendor labels to render (0..1), top-N by risk desc. */
  labelDensity: number
  /** Append `· NN%` colored by risk level. */
  showRiskChip: boolean
  /** Append small mono `· N` contract count (omitted when data missing). */
  showContractCount: boolean
  /** Multiplier applied to the per-risk dot radius. */
  dotScaleMultiplier: number
}

export function useAtlasLOD(effectiveScale: number): AtlasLOD {
  return useMemo(() => {
    if (effectiveScale < 4) {
      // Galaxy zoom: cluster NAMES shown (separately via cluster-label
      // overlay in CanvasConstellation), vendor labels HIDDEN.
      // User report 2026-05-21: at labelDensity 0.15, vendor labels like
      // "Repsol Comercializadora" and "Alstom Transport Mexico" floated
      // across the canvas and collided with the cluster captions —
      // "I can't see anything, very badly organized." Clean galaxy view
      // is cluster identity only; vendor names reveal at region band.
      return {
        band: 'constellation',
        labelDensity: 0,
        showRiskChip: false,
        showContractCount: false,
        dotScaleMultiplier: 1.0,
      }
    }
    if (effectiveScale < 12) {
      return {
        band: 'region',
        labelDensity: 0.5,
        showRiskChip: false,
        showContractCount: false,
        dotScaleMultiplier: 1.15,
      }
    }
    return {
      band: 'star',
      labelDensity: 1.0,
      showRiskChip: true,
      showContractCount: true,
      dotScaleMultiplier: 1.35,
    }
  }, [effectiveScale])
}

/** Localized human-readable band name for the zoom indicator chip. */
export function atlasLODBandLabel(band: AtlasLODBand, lang: 'en' | 'es'): string {
  if (lang === 'es') {
    return band === 'constellation' ? 'constelación' : band === 'region' ? 'región' : 'estrella'
  }
  return band
}

/**
 * Shared chart theme utilities.
 * Uses CSS variables so charts render correctly in both light and dark modes.
 */
import type React from 'react';

export const CHART_TICK_STYLE = {
  fill: 'var(--color-text-muted)',
  fontSize: 11,
  fontFamily: "var(--font-family-mono, ui-monospace, 'SF Mono', monospace)",
} as const;

export const CHART_GRID_STYLE = {
  stroke: 'var(--color-border)',
  strokeDasharray: '3 3',
} as const;

export const CHART_AXIS_LINE = {
  stroke: 'var(--color-border)',
} as const;

export const CHART_AXIS_TICK_LINE = {
  stroke: 'var(--color-border)',
} as const;

/** Recharts contentStyle for <Tooltip contentStyle={CHART_TOOLTIP_STYLE} /> */
export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--color-background-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  padding: '8px 12px',
  color: 'var(--color-text-primary)',
  fontSize: '12px',
  fontFamily: "var(--font-family-mono, ui-monospace, 'SF Mono', monospace)",
};

export const CHART_TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: 'var(--color-text-primary)',
  fontWeight: 600,
  marginBottom: 4,
};

export const CHART_TOOLTIP_ITEM_STYLE: React.CSSProperties = {
  color: 'var(--color-text-muted)',
};

export const CHART_CURSOR_STYLE = {
  stroke: 'var(--color-border)',
  strokeWidth: 1,
};

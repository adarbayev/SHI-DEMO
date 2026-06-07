export function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function formatCompactNumber(value) {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatCurrency(value, digits = 0) {
  if (!Number.isFinite(value)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function formatCompactCurrency(value) {
  if (!Number.isFinite(value)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatEmissions(value, digits = 0) {
  return `${formatNumber(value, digits)} tCO2e`
}

export function formatMwh(value, digits = 0) {
  return `${formatNumber(value, digits)} MWh`
}

export function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return '0%'
  return `${formatNumber(value * 100, digits)}%`
}

export function formatPayback(value) {
  if (!Number.isFinite(value) || value <= 0) return 'Not paid back'
  return `${formatNumber(value, 1)} years`
}

export function parseNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

import { baselineEnergy2026 } from './seedEnergy'

const energyKeys = ['electricityMWh', 'naturalGasMWh', 'dieselMWh', 'petrolMWh']

const energyCostKeys = {
  electricityMWh: 'electricityCostUsdPerMWh',
  naturalGasMWh: 'naturalGasCostUsdPerMWh',
  dieselMWh: 'dieselCostUsdPerMWh',
  petrolMWh: 'petrolCostUsdPerMWh',
}

const defaultAnnualMultipliers = {
  2023: { electricityMWh: 0.86, naturalGasMWh: 0.91, dieselMWh: 0.9, petrolMWh: 0.92 },
  2024: { electricityMWh: 0.94, naturalGasMWh: 0.96, dieselMWh: 0.95, petrolMWh: 0.97 },
  2025: { electricityMWh: 1, naturalGasMWh: 1, dieselMWh: 1, petrolMWh: 1 },
}

const siteAnnualMultipliers = {
  'ridge-dcf-nj': {
    2023: { electricityMWh: 0.82, naturalGasMWh: 0.9, dieselMWh: 0.9, petrolMWh: 1 },
    2024: { electricityMWh: 0.92, naturalGasMWh: 0.96, dieselMWh: 0.95, petrolMWh: 1 },
  },
  'nexus-uk': {
    2023: { electricityMWh: 0.88, naturalGasMWh: 0.94, dieselMWh: 0.9, petrolMWh: 1 },
    2024: { electricityMWh: 0.95, naturalGasMWh: 0.98, dieselMWh: 0.95, petrolMWh: 1 },
  },
  'leased-office-demo': {
    2023: { electricityMWh: 0.76, naturalGasMWh: 0.8, dieselMWh: 1, petrolMWh: 0.82 },
    2024: { electricityMWh: 0.9, naturalGasMWh: 0.92, dieselMWh: 1, petrolMWh: 0.93 },
  },
}

const costMultipliersByYear = {
  2023: 0.91,
  2024: 0.96,
  2025: 1,
}

const renewableMatchByYear = {
  2023: 0.08,
  2024: 0.1,
  2025: 1,
}

const electricityMonthlyShape = [0.086, 0.079, 0.083, 0.081, 0.084, 0.087, 0.091, 0.089, 0.083, 0.082, 0.081, 0.079]
const fuelMonthlyShape = [0.126, 0.113, 0.102, 0.08, 0.064, 0.052, 0.047, 0.048, 0.061, 0.08, 0.102, 0.127]
const transportMonthlyShape = [0.076, 0.074, 0.083, 0.085, 0.089, 0.09, 0.084, 0.082, 0.088, 0.09, 0.081, 0.078]

const sourceSystemBySite = {
  'shi-hq-nj': 'BMS + utility invoices',
  'ridge-dcf-nj': 'DCIM + utility interval export',
  'euc-nj': 'BMS + utility invoices',
  'nexus-uk': 'DCIM + UK half-hourly meters',
  'issy-fr': 'Utility invoices',
  'leased-office-demo': 'Leased office allocation',
}

const dataQualityBySite = {
  'shi-hq-nj': 'Metered monthly',
  'ridge-dcf-nj': 'Interval-metered',
  'euc-nj': 'Metered monthly',
  'nexus-uk': 'Interval-metered',
  'issy-fr': 'Metered monthly',
  'leased-office-demo': 'Allocated monthly',
}

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function normaliseWeights(weights) {
  const sum = weights.reduce((total, value) => total + value, 0)
  return weights.map((value) => value / sum)
}

function splitAnnualValue(annualValue, weights) {
  const normalised = normaliseWeights(weights)
  let runningTotal = 0
  return normalised.map((weight, index) => {
    if (index === normalised.length - 1) return round(annualValue - runningTotal)
    const monthlyValue = round(annualValue * weight)
    runningTotal += monthlyValue
    return monthlyValue
  })
}

function getMonthlyShape(key) {
  if (key === 'electricityMWh') return electricityMonthlyShape
  if (key === 'naturalGasMWh') return fuelMonthlyShape
  return transportMonthlyShape
}

function getAnnualValue(row, year, key) {
  const siteYearMultipliers = siteAnnualMultipliers[row.siteId]?.[year] ?? {}
  const defaultYearMultipliers = defaultAnnualMultipliers[year] ?? defaultAnnualMultipliers[2025]
  const multiplier = siteYearMultipliers[key] ?? defaultYearMultipliers[key] ?? 1
  return round(row[key] * multiplier)
}

function buildSiteYearRows(row, year) {
  const monthlyValues = Object.fromEntries(
    energyKeys.map((key) => [
      key,
      splitAnnualValue(getAnnualValue(row, year, key), getMonthlyShape(key)),
    ]),
  )
  const costMultiplier = costMultipliersByYear[year] ?? 1

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    return {
      siteId: row.siteId,
      year,
      month,
      electricityMWh: monthlyValues.electricityMWh[index],
      naturalGasMWh: monthlyValues.naturalGasMWh[index],
      dieselMWh: monthlyValues.dieselMWh[index],
      petrolMWh: monthlyValues.petrolMWh[index],
      electricityCostUsdPerMWh: round(row[energyCostKeys.electricityMWh] * costMultiplier, 2),
      naturalGasCostUsdPerMWh: round(row[energyCostKeys.naturalGasMWh] * costMultiplier, 2),
      dieselCostUsdPerMWh: round(row[energyCostKeys.dieselMWh] * costMultiplier, 2),
      petrolCostUsdPerMWh: round(row[energyCostKeys.petrolMWh] * costMultiplier, 2),
      renewableElectricityMatchedPercent: renewableMatchByYear[year] ?? 0,
      sourceSystem: sourceSystemBySite[row.siteId] ?? 'Utility data',
      dataQuality: dataQualityBySite[row.siteId] ?? 'Seeded monthly',
    }
  })
}

export const operationalMonthlyData = baselineEnergy2026.flatMap((row) =>
  [2023, 2024, 2025].flatMap((year) => buildSiteYearRows(row, year)),
)

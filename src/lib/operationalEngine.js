import {
  calculateEmissions,
  calculateEnergyCost,
  costKeysByEnergy,
  energyKeys,
} from './projectionEngine'

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function periodKey(row) {
  return `${row.year}-${String(row.month).padStart(2, '0')}`
}

function sumRows(rows, key) {
  return rows.reduce((sum, row) => sum + (row[key] ?? 0), 0)
}

function weightedAverageCost(rows, energyKey) {
  const costKey = costKeysByEnergy[energyKey]
  const energy = sumRows(rows, energyKey)
  if (energy <= 0) return 0
  return round(rows.reduce((sum, row) => sum + row[energyKey] * row[costKey], 0) / energy, 4)
}

function addToGroup(map, key, row, seed) {
  const current = map.get(key) ?? { ...seed }
  for (const energyKey of energyKeys) current[energyKey] += row[energyKey] ?? 0
  current.totalEnergyMWh += row.totalEnergyMWh ?? 0
  current.energyCostUsd += row.energyCostUsd ?? 0
  current.scope1Tco2e += row.scope1Tco2e ?? 0
  current.scope2LocationBasedTco2e += row.scope2LocationBasedTco2e ?? 0
  current.totalEmissionsTco2e += row.totalEmissionsTco2e ?? 0
  map.set(key, current)
}

function sortByYearMonth(a, b) {
  return a.year - b.year || (a.month ?? 0) - (b.month ?? 0)
}

export function deriveBaselineEnergyFromOperationalData(rows, referenceRows = [], baselineYear = 2025) {
  const referenceBySite = new Map(referenceRows.map((row) => [row.siteId, row]))
  const siteIds = [...new Set(rows.filter((row) => row.year === baselineYear).map((row) => row.siteId))]

  return siteIds.map((siteId) => {
    const siteRows = rows.filter((row) => row.siteId === siteId && row.year === baselineYear)
    const reference = referenceBySite.get(siteId) ?? {}
    return {
      ...reference,
      siteId,
      year: baselineYear,
      electricityMWh: round(sumRows(siteRows, 'electricityMWh')),
      naturalGasMWh: round(sumRows(siteRows, 'naturalGasMWh')),
      dieselMWh: round(sumRows(siteRows, 'dieselMWh')),
      petrolMWh: round(sumRows(siteRows, 'petrolMWh')),
      electricityCostUsdPerMWh: weightedAverageCost(siteRows, 'electricityMWh') || reference.electricityCostUsdPerMWh || 0,
      naturalGasCostUsdPerMWh: weightedAverageCost(siteRows, 'naturalGasMWh') || reference.naturalGasCostUsdPerMWh || 0,
      dieselCostUsdPerMWh: weightedAverageCost(siteRows, 'dieselMWh') || reference.dieselCostUsdPerMWh || 0,
      petrolCostUsdPerMWh: weightedAverageCost(siteRows, 'petrolMWh') || reference.petrolCostUsdPerMWh || 0,
    }
  })
}

export function enrichOperationalRows({ rows, sites, assumptions, emissionFactors }) {
  const siteById = new Map(sites.map((site) => [site.id, site]))
  return rows
    .map((row) => {
      const site = siteById.get(row.siteId)
      if (!site) return null
      const emissions = calculateEmissions(row, site.country, assumptions, emissionFactors)
      return {
        ...row,
        ...emissions,
        period: periodKey(row),
        siteName: site.name,
        siteShortName: site.siteShortName ?? site.name,
        mapLabel: site.mapLabel ?? site.name,
        country: site.country,
        region: site.region,
        archetype: site.archetype,
        latitude: site.latitude,
        longitude: site.longitude,
        operationalLoadClass: site.operationalLoadClass,
        totalEnergyMWh: energyKeys.reduce((sum, key) => sum + row[key], 0),
        energyCostUsd: calculateEnergyCost(row),
      }
    })
    .filter(Boolean)
    .sort(sortByYearMonth)
}

export function getLatestPeriod(rows) {
  return rows.reduce(
    (latest, row) => {
      if (row.year > latest.year || (row.year === latest.year && row.month > latest.month)) {
        return { year: row.year, month: row.month, period: row.period }
      }
      return latest
    },
    { year: 0, month: 0, period: '' },
  )
}

export function getMonthlyElectricityTrend(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = row.period
    const current = groups.get(key) ?? {
      period: row.period,
      year: row.year,
      month: row.month,
      electricityMWh: 0,
      energyCostUsd: 0,
      totalEmissionsTco2e: 0,
    }
    current.electricityMWh += row.electricityMWh
    current.energyCostUsd += row.energyCostUsd
    current.totalEmissionsTco2e += row.totalEmissionsTco2e
    groups.set(key, current)
  }
  return [...groups.values()].sort(sortByYearMonth)
}

export function getFuelMixRows(rows) {
  const groups = new Map()
  for (const row of rows) {
    addToGroup(groups, row.year, row, {
      year: row.year,
      electricityMWh: 0,
      naturalGasMWh: 0,
      dieselMWh: 0,
      petrolMWh: 0,
      totalEnergyMWh: 0,
      energyCostUsd: 0,
      scope1Tco2e: 0,
      scope2LocationBasedTco2e: 0,
      totalEmissionsTco2e: 0,
    })
  }
  return [...groups.values()].sort((a, b) => a.year - b.year)
}

export function getYearlySiteRows(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = `${row.year}-${row.siteId}`
    addToGroup(groups, key, row, {
      siteId: row.siteId,
      siteName: row.siteName,
      siteShortName: row.siteShortName,
      mapLabel: row.mapLabel,
      country: row.country,
      region: row.region,
      archetype: row.archetype,
      latitude: row.latitude,
      longitude: row.longitude,
      operationalLoadClass: row.operationalLoadClass,
      year: row.year,
      electricityMWh: 0,
      naturalGasMWh: 0,
      dieselMWh: 0,
      petrolMWh: 0,
      totalEnergyMWh: 0,
      energyCostUsd: 0,
      scope1Tco2e: 0,
      scope2LocationBasedTco2e: 0,
      totalEmissionsTco2e: 0,
    })
  }
  return [...groups.values()]
    .map((row) => ({
      ...row,
      electricityShare: row.totalEnergyMWh > 0 ? row.electricityMWh / row.totalEnergyMWh : 0,
    }))
    .sort((a, b) => a.year - b.year || b.totalEmissionsTco2e - a.totalEmissionsTco2e)
}

export function getHotspotRows(rows, year) {
  return getYearlySiteRows(rows)
    .filter((row) => row.year === year)
    .sort((a, b) => b.totalEmissionsTco2e - a.totalEmissionsTco2e)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      hotspotTier: index < 2 ? 'High' : index < 4 ? 'Medium' : 'Watch',
    }))
}

export function getMapSiteRows(rows) {
  const latestYear = Math.max(...rows.map((row) => row.year))
  const latestRows = getHotspotRows(rows, latestYear)
  const previousRowsBySite = new Map(
    getYearlySiteRows(rows)
      .filter((row) => row.year === latestYear - 1)
      .map((row) => [row.siteId, row]),
  )

  return latestRows.map((row) => {
    const previous = previousRowsBySite.get(row.siteId)
    const yoyEnergyChange =
      previous?.totalEnergyMWh > 0
        ? (row.totalEnergyMWh - previous.totalEnergyMWh) / previous.totalEnergyMWh
        : 0
    return {
      ...row,
      yoyEnergyChange,
    }
  })
}

export function getOperationalKpis(rows) {
  const latest = getLatestPeriod(rows)
  const latestPeriodRows = rows.filter((row) => row.year === latest.year && row.month === latest.month)
  const latestYearRows = rows.filter((row) => row.year === latest.year)
  const previousYearRows = rows.filter((row) => row.year === latest.year - 1)
  const hotspotRows = getHotspotRows(rows, latest.year)
  const electricityMWh = sumRows(latestPeriodRows, 'electricityMWh')
  const renewableElectricityMWh = latestPeriodRows.reduce(
    (sum, row) => sum + row.electricityMWh * (row.renewableElectricityMatchedPercent ?? 0),
    0,
  )
  const latestYearEnergy = sumRows(latestYearRows, 'totalEnergyMWh')
  const previousYearEnergy = sumRows(previousYearRows, 'totalEnergyMWh')

  return {
    latest,
    latestPeriod: {
      electricityMWh,
      totalEnergyMWh: sumRows(latestPeriodRows, 'totalEnergyMWh'),
      energyCostUsd: sumRows(latestPeriodRows, 'energyCostUsd'),
      totalEmissionsTco2e: sumRows(latestPeriodRows, 'totalEmissionsTco2e'),
      renewableElectricityMatchedPercent:
        electricityMWh > 0 ? renewableElectricityMWh / electricityMWh : 0,
    },
    latestYearEnergy,
    yoyEnergyChange:
      previousYearEnergy > 0 ? (latestYearEnergy - previousYearEnergy) / previousYearEnergy : 0,
    topHotspot: hotspotRows[0] ?? null,
  }
}

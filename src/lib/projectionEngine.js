export const energyKeys = ['electricityMWh', 'naturalGasMWh', 'dieselMWh', 'petrolMWh']

export const costKeysByEnergy = {
  electricityMWh: 'electricityCostUsdPerMWh',
  naturalGasMWh: 'naturalGasCostUsdPerMWh',
  dieselMWh: 'dieselCostUsdPerMWh',
  petrolMWh: 'petrolCostUsdPerMWh',
}

export function generateYears(startYear, endYear) {
  const years = []
  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year)
  }
  return years
}

export function getElectricityFactor(country, year, assumptions, emissionFactors) {
  const baseYear = 2025
  const baseFactor = emissionFactors.electricityLocationBased[country]?.[baseYear] ?? 0
  const countryDefaultRate = emissionFactors.countryGridDecarbonisationRates[country]
  const declineRate = assumptions.gridDecarbonisationRate ?? countryDefaultRate ?? 0
  return Math.max(0, baseFactor * Math.max(0, 1 - declineRate * (year - baseYear)))
}

export function calculateEnergyCost(row) {
  return energyKeys.reduce((sum, key) => sum + row[key] * row[costKeysByEnergy[key]], 0)
}

export function calculateEmissions(row, country, assumptions, emissionFactors) {
  const electricityFactor = getElectricityFactor(country, row.year, assumptions, emissionFactors)
  const scope2LocationBasedTco2e = row.electricityMWh * electricityFactor
  const scope1Tco2e =
    row.naturalGasMWh * emissionFactors.fuels.naturalGasTco2ePerMWh +
    row.dieselMWh * emissionFactors.fuels.dieselTco2ePerMWh +
    row.petrolMWh * emissionFactors.fuels.petrolTco2ePerMWh

  return {
    electricityFactor,
    scope1Tco2e,
    scope2LocationBasedTco2e,
    totalEmissionsTco2e: scope1Tco2e + scope2LocationBasedTco2e,
  }
}

export function projectBauEnergy(site, baselineRow, assumptions, emissionFactors, years) {
  return years.map((year) => {
    const yearOffset = year - baselineRow.year
    const electricityGrowth =
      assumptions.electricityGrowthRate + assumptions.siteExpansionGrowthRate
    const fuelGrowth = assumptions.fuelGrowthRate + assumptions.siteExpansionGrowthRate
    const priceGrowth = assumptions.energyPriceEscalationRate
    const linearElectricityGrowth = Math.max(0, 1 + electricityGrowth * yearOffset)
    const linearFuelGrowth = Math.max(0, 1 + fuelGrowth * yearOffset)
    const linearPriceGrowth = Math.max(0, 1 + priceGrowth * yearOffset)

    const projected = {
      siteId: site.id,
      siteName: site.name,
      country: site.country,
      region: site.region,
      archetype: site.archetype,
      year,
      electricityMWh: baselineRow.electricityMWh * linearElectricityGrowth,
      naturalGasMWh: baselineRow.naturalGasMWh * linearFuelGrowth,
      dieselMWh: baselineRow.dieselMWh * linearFuelGrowth,
      petrolMWh: baselineRow.petrolMWh * linearFuelGrowth,
      electricityCostUsdPerMWh:
        baselineRow.electricityCostUsdPerMWh * linearPriceGrowth,
      naturalGasCostUsdPerMWh:
        baselineRow.naturalGasCostUsdPerMWh * linearPriceGrowth,
      dieselCostUsdPerMWh: baselineRow.dieselCostUsdPerMWh * linearPriceGrowth,
      petrolCostUsdPerMWh: baselineRow.petrolCostUsdPerMWh * linearPriceGrowth,
    }

    const emissions = calculateEmissions(projected, site.country, assumptions, emissionFactors)

    return {
      ...projected,
      ...emissions,
      totalEnergyMWh: energyKeys.reduce((sum, key) => sum + projected[key], 0),
      energyCostUsd: calculateEnergyCost(projected),
    }
  })
}

export function aggregateYearRows(rows, years) {
  return years.map((year) => {
    const yearRows = rows.filter((row) => row.year === year)
    const total = {
      year,
      electricityMWh: 0,
      naturalGasMWh: 0,
      dieselMWh: 0,
      petrolMWh: 0,
      totalEnergyMWh: 0,
      energyCostUsd: 0,
      scope1Tco2e: 0,
      scope2LocationBasedTco2e: 0,
      totalEmissionsTco2e: 0,
    }

    for (const row of yearRows) {
      for (const key of energyKeys) total[key] += row[key]
      total.totalEnergyMWh += row.totalEnergyMWh
      total.energyCostUsd += row.energyCostUsd
      total.scope1Tco2e += row.scope1Tco2e
      total.scope2LocationBasedTco2e += row.scope2LocationBasedTco2e
      total.totalEmissionsTco2e += row.totalEmissionsTco2e
    }

    return total
  })
}

export function calculateBauProjection({ sites, baselineEnergy, assumptions, emissionFactors }) {
  const years = generateYears(assumptions.startYear, assumptions.endYear)
  const includedSites = new Set(assumptions.includedSiteIds ?? sites.map((site) => site.id))
  const siteYearRows = sites
    .filter((site) => includedSites.has(site.id))
    .flatMap((site) => {
      const baselineRow = baselineEnergy.find((row) => row.siteId === site.id)
      if (!baselineRow) return []
      return projectBauEnergy(site, baselineRow, assumptions, emissionFactors, years)
    })

  return {
    id: 'bau',
    name: 'Business as usual',
    years,
    siteYearRows,
    yearly: aggregateYearRows(siteYearRows, years),
    measureImpacts: [],
  }
}

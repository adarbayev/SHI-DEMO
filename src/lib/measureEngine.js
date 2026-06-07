import {
  aggregateYearRows,
  calculateEmissions,
  calculateEnergyCost,
  costKeysByEnergy,
  energyKeys,
} from './projectionEngine'

const scopeIndicators = {
  scope1Tco2e: 'naturalGasMWh',
  scope2LocationBasedTco2e: 'electricityMWh',
  scope2MarketBasedTco2e: 'electricityMWh',
  purchasedElectricityMWh: 'electricityMWh',
}

export function getMeasureRamp(year, startYear, phaseInYears) {
  if (year < startYear) return 0
  const safePhaseInYears = Math.max(1, phaseInYears)
  const yearsSinceStart = year - startYear + 1
  return Math.min(1, yearsSinceStart / safePhaseInYears)
}

export function isMeasureActive(year, measure) {
  return year >= measure.startYear && year < measure.startYear + measure.usefulLifeYears
}

function normaliseIndicator(indicator) {
  return scopeIndicators[indicator] ?? indicator
}

function getFuelFactor(energyKey, emissionFactors) {
  if (energyKey === 'naturalGasMWh') return emissionFactors.fuels.naturalGasTco2ePerMWh
  if (energyKey === 'dieselMWh') return emissionFactors.fuels.dieselTco2ePerMWh
  if (energyKey === 'petrolMWh') return emissionFactors.fuels.petrolTco2ePerMWh
  return 0
}

function calculateReductionAmount(measure, row, energyKey, ramp) {
  const availableEnergy = Math.max(0, row[energyKey] ?? 0)
  if (measure.reductionType === 'absolute') {
    return Math.min(availableEnergy, measure.reductionValue * ramp)
  }
  return Math.min(availableEnergy, availableEnergy * measure.reductionValue * ramp)
}

function applyMeasureToRow(row, measure, emissionFactors, assumptions) {
  if (!isMeasureActive(row.year, measure)) return null

  const ramp = getMeasureRamp(row.year, measure.startYear, measure.phaseInYears)
  if (ramp <= 0) return null

  const before = { ...row }
  const energyKey = normaliseIndicator(measure.targetEnergyIndicator)
  if (!energyKeys.includes(energyKey)) return null

  let energyReductionMWh = calculateReductionAmount(measure, row, energyKey, ramp)
  let addedElectricityMWh = 0
  let avoidedEnergyCostUsd

  if (measure.category === 'Solar PV installation') {
    const selfConsumption = measure.selfConsumptionPercentage ?? 0.85
    energyReductionMWh = Math.min(row.electricityMWh, energyReductionMWh * selfConsumption)
    row.electricityMWh -= energyReductionMWh
    avoidedEnergyCostUsd = energyReductionMWh * row.electricityCostUsdPerMWh
  } else if (
    measure.category === 'Transport electrification' ||
    measure.category === 'Gas-to-electric heating'
  ) {
    const efficiencyRatio = measure.electrificationEfficiencyRatio ?? 3
    addedElectricityMWh = energyReductionMWh / efficiencyRatio
    row[energyKey] -= energyReductionMWh
    row.electricityMWh += addedElectricityMWh
    avoidedEnergyCostUsd =
      energyReductionMWh * row[costKeysByEnergy[energyKey]] -
      addedElectricityMWh * row.electricityCostUsdPerMWh
  } else {
    row[energyKey] -= energyReductionMWh
    avoidedEnergyCostUsd = energyReductionMWh * row[costKeysByEnergy[energyKey]]
  }

  const afterEmissions = calculateEmissions(row, row.country, assumptions, emissionFactors)
  const beforeEmissions = calculateEmissions(before, before.country, assumptions, emissionFactors)
  const emissionsReductionTco2e =
    beforeEmissions.totalEmissionsTco2e - afterEmissions.totalEmissionsTco2e

  return {
    measureId: measure.id,
    scenarioId: measure.scenarioId,
    siteId: measure.siteId,
    year: row.year,
    ramp,
    energyReductionMWh,
    addedElectricityMWh,
    avoidedEnergyCostUsd: avoidedEnergyCostUsd ?? 0,
    scope1ReductionTco2e:
      energyKey === 'naturalGasMWh' || energyKey === 'dieselMWh' || energyKey === 'petrolMWh'
        ? energyReductionMWh * getFuelFactor(energyKey, emissionFactors)
        : 0,
    emissionsReductionTco2e,
  }
}

export function applyMeasuresToProjection({
  bauProjection,
  measures,
  scenario,
  assumptions,
  emissionFactors,
}) {
  if (scenario.id === 'bau') {
    return { ...bauProjection, id: scenario.id, name: scenario.name }
  }

  const scenarioMeasures = measures
    .filter((measure) => measure.scenarioId === scenario.id)
    .sort((a, b) => a.startYear - b.startYear)

  const measureImpacts = []
  const siteYearRows = bauProjection.siteYearRows.map((bauRow) => {
    const row = { ...bauRow }
    const matchingMeasures = scenarioMeasures.filter((measure) => measure.siteId === row.siteId)

    for (const measure of matchingMeasures) {
      const impact = applyMeasureToRow(row, measure, emissionFactors, assumptions)
      if (impact) measureImpacts.push(impact)
    }

    const emissions = calculateEmissions(row, row.country, assumptions, emissionFactors)
    return {
      ...row,
      ...emissions,
      totalEnergyMWh: energyKeys.reduce((sum, key) => sum + row[key], 0),
      energyCostUsd: calculateEnergyCost(row),
    }
  })

  return {
    id: scenario.id,
    name: scenario.name,
    years: bauProjection.years,
    siteYearRows,
    yearly: aggregateYearRows(siteYearRows, bauProjection.years),
    measureImpacts,
  }
}

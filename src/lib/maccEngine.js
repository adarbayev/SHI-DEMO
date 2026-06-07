import {
  calculateAnnualisedCapex,
  calculateAnnualNetBenefit,
  calculateCarbonPriceValue,
  calculatePayback,
  calculatePresentValue,
} from './financeEngine'

function groupImpactsByMeasure(impacts) {
  return impacts.reduce((groups, impact) => {
    if (!groups.has(impact.measureId)) groups.set(impact.measureId, [])
    groups.get(impact.measureId).push(impact)
    return groups
  }, new Map())
}

function getRepresentativeImpact(measure, impacts) {
  const fullYear = measure.startYear + Math.max(1, measure.phaseInYears) - 1
  return (
    impacts.find((impact) => impact.year === Math.max(2030, fullYear)) ??
    impacts.find((impact) => impact.year === fullYear) ??
    impacts.reduce(
      (best, impact) =>
        impact.emissionsReductionTco2e > (best?.emissionsReductionTco2e ?? -Infinity)
          ? impact
          : best,
      null,
    )
  )
}

export function calculateMeasureFinanceRows({
  measures,
  scenarioProjection,
  internalCarbonPriceUsdPerTco2e,
  discountRate,
}) {
  const grouped = groupImpactsByMeasure(scenarioProjection.measureImpacts)

  return measures
    .filter((measure) => measure.scenarioId === scenarioProjection.id)
    .map((measure) => {
      const impacts = grouped.get(measure.id) ?? []
      const representativeImpact = getRepresentativeImpact(measure, impacts)
      const annualEmissionsReductionTco2e =
        representativeImpact?.emissionsReductionTco2e > 0
          ? representativeImpact.emissionsReductionTco2e
          : 0
      const annualAvoidedEnergyCostUsd = representativeImpact?.avoidedEnergyCostUsd ?? 0
      const carbonPriceValueUsd = measure.internalCarbonPriceEligible
        ? calculateCarbonPriceValue(
            annualEmissionsReductionTco2e,
            internalCarbonPriceUsdPerTco2e,
          )
        : 0
      const annualisedCapexUsd = calculateAnnualisedCapex(
        measure.capexUsd,
        discountRate,
        measure.usefulLifeYears,
      )
      const annualNetBenefitUsd = calculateAnnualNetBenefit(
        annualAvoidedEnergyCostUsd,
        carbonPriceValueUsd,
        measure.annualOpexChangeUsd,
      )
      const simplePaybackYears = calculatePayback(measure.capexUsd, annualNetBenefitUsd)
      const cumulativeAbatementTco2e = impacts.reduce(
        (sum, impact) => sum + Math.max(0, impact.emissionsReductionTco2e),
        0,
      )
      const grossMacUsdPerTco2e =
        annualEmissionsReductionTco2e > 0
          ? (annualisedCapexUsd + measure.annualOpexChangeUsd - annualAvoidedEnergyCostUsd) /
            annualEmissionsReductionTco2e
          : null
      const adjustedMacUsdPerTco2e =
        annualEmissionsReductionTco2e > 0
          ? (annualisedCapexUsd +
              measure.annualOpexChangeUsd -
              annualAvoidedEnergyCostUsd -
              carbonPriceValueUsd) /
            annualEmissionsReductionTco2e
          : null

      const netPresentCostUsd =
        measure.capexUsd +
        impacts.reduce((sum, impact) => {
          const yearOffset = Math.max(0, impact.year - measure.startYear + 1)
          const carbonValue = measure.internalCarbonPriceEligible
            ? calculateCarbonPriceValue(
                Math.max(0, impact.emissionsReductionTco2e),
                internalCarbonPriceUsdPerTco2e,
              )
            : 0
          const annualCost = measure.annualOpexChangeUsd - impact.avoidedEnergyCostUsd - carbonValue
          return sum + calculatePresentValue(annualCost, discountRate, yearOffset)
        }, 0)

      return {
        ...measure,
        annualEmissionsReductionTco2e,
        annualAvoidedEnergyCostUsd,
        carbonPriceValueUsd,
        annualisedCapexUsd,
        annualNetBenefitUsd,
        simplePaybackYears,
        cumulativeAbatementTco2e,
        grossMacUsdPerTco2e,
        adjustedMacUsdPerTco2e,
        netPresentCostUsd,
        representativeYear: representativeImpact?.year ?? measure.startYear,
      }
    })
}

export function sortMeasuresByMac(rows, view = 'gross') {
  const key = view === 'adjusted' ? 'adjustedMacUsdPerTco2e' : 'grossMacUsdPerTco2e'
  return [...rows].sort((a, b) => (a[key] ?? Infinity) - (b[key] ?? Infinity))
}

export function buildMaccCurveBlocks(rows, view = 'gross') {
  const key = view === 'adjusted' ? 'adjustedMacUsdPerTco2e' : 'grossMacUsdPerTco2e'
  let cumulativeAbatementTco2e = 0

  return sortMeasuresByMac(rows, view)
    .filter(
      (row) =>
        row.annualEmissionsReductionTco2e > 0 &&
        Number.isFinite(row[key]),
    )
    .map((row, index) => {
      const widthTco2e = row.annualEmissionsReductionTco2e
      const x0 = cumulativeAbatementTco2e
      const x1 = cumulativeAbatementTco2e + widthTco2e
      cumulativeAbatementTco2e = x1

      return {
        ...row,
        index,
        x0,
        x1,
        xMid: (x0 + x1) / 2,
        widthTco2e,
        macUsdPerTco2e: row[key],
        totalAnnualCostUsd: row[key] * widthTco2e,
      }
    })
}

export function calculateFinanceSummary(rows) {
  const totalAnnualReduction = rows.reduce(
    (sum, row) => sum + row.annualEmissionsReductionTco2e,
    0,
  )
  const totalAnnualBenefit = rows.reduce((sum, row) => sum + row.annualNetBenefitUsd, 0)

  return {
    totalCapexUsd: rows.reduce((sum, row) => sum + row.capexUsd, 0),
    totalAnnualOpexChangeUsd: rows.reduce((sum, row) => sum + row.annualOpexChangeUsd, 0),
    totalAvoidedEnergyCostUsd: rows.reduce((sum, row) => sum + row.annualAvoidedEnergyCostUsd, 0),
    totalAnnualReductionTco2e: totalAnnualReduction,
    averageCostPerTco2e:
      totalAnnualReduction > 0
        ? rows.reduce((sum, row) => sum + row.annualisedCapexUsd + row.annualOpexChangeUsd, 0) /
          totalAnnualReduction
        : 0,
    weightedAveragePaybackYears:
      totalAnnualBenefit > 0
        ? rows.reduce((sum, row) => {
            const payback = row.simplePaybackYears ?? 0
            return sum + payback * Math.max(0, row.annualNetBenefitUsd)
          }, 0) / totalAnnualBenefit
        : null,
    internalCarbonPriceValueUsd: rows.reduce((sum, row) => sum + row.carbonPriceValueUsd, 0),
  }
}

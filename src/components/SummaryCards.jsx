import { calculateGapToTarget } from '../lib/targetEngine'
import {
  formatCompactCurrency,
  formatCurrency,
  formatEmissions,
  formatNumber,
} from '../lib/formatters'
import MetricCard from './MetricCard'

function getYearPoint(projection, year) {
  return projection.yearly.find((point) => point.year === year) ?? projection.yearly.at(-1)
}

export default function SummaryCards({
  bauProjection,
  selectedProjection,
  targetPathway,
  selectedMeasures,
  financeRows,
}) {
  const bau2030 = getYearPoint(bauProjection, 2030)
  const selected2030 = getYearPoint(selectedProjection, 2030)
  const selected2050 = getYearPoint(selectedProjection, 2050)
  const target2030 = targetPathway.find((point) => point.year === 2030)
  const targetGap = calculateGapToTarget(selectedProjection.yearly, targetPathway, 2030)
  const annualAvoidedEnergyCost = financeRows.reduce(
    (sum, row) => sum + row.annualAvoidedEnergyCostUsd,
    0,
  )
  const annualReduction = Math.max(
    0,
    (bau2030?.totalEmissionsTco2e ?? 0) - (selected2030?.totalEmissionsTco2e ?? 0),
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="2030 BAU emissions" value={formatEmissions(bau2030?.totalEmissionsTco2e)} />
      <MetricCard label="2030 target" value={formatEmissions(target2030?.targetTco2e)} />
      <MetricCard
        label="2030 target gap"
        value={formatEmissions(targetGap)}
        detail={targetGap > 0 ? 'Above target pathway' : 'On or below target pathway'}
        tone={targetGap > 0 ? 'risk' : 'success'}
      />
      <MetricCard
        label="2050 selected scenario"
        value={formatEmissions(selected2050?.totalEmissionsTco2e)}
      />
      <MetricCard
        label="Cumulative capex"
        value={formatCompactCurrency(selectedMeasures.reduce((sum, measure) => sum + measure.capexUsd, 0))}
      />
      <MetricCard
        label="Annual avoided energy cost"
        value={formatCurrency(annualAvoidedEnergyCost)}
        tone="success"
      />
      <MetricCard label="Annual emissions reduction" value={formatEmissions(annualReduction)} />
      <MetricCard
        label="Active measures"
        value={formatNumber(selectedMeasures.length)}
        detail="In selected scenario"
      />
    </div>
  )
}

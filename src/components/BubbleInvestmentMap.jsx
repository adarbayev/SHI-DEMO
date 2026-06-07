import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import {
  formatCompactCurrency,
  formatCurrency,
  formatEmissions,
  formatNumber,
} from '../lib/formatters'
import ChartFrame from './ChartFrame'

export default function BubbleInvestmentMap({ rows }) {
  const data = rows.map((row) => ({
    name: row.name,
    cumulativeAbatementTco2e: row.cumulativeAbatementTco2e,
    netPresentCostUsd: row.netPresentCostUsd,
    annualEmissionsReductionTco2e: row.annualEmissionsReductionTco2e,
    capexUsd: row.capexUsd,
    annualNetBenefitUsd: row.annualNetBenefitUsd,
    grossMacUsdPerTco2e: row.grossMacUsdPerTco2e,
    representativeYear: row.representativeYear,
  }))

  return (
    <section className="panel">
      <div className="section-heading">
        <p>Bubble investment map</p>
        <span>X = cumulative tCO2e, Y = net present cost, size = annual tCO2e</span>
      </div>
      <ChartFrame className="mt-4 h-[320px]">
        {({ width, height }) => (
          <ScatterChart width={width} height={height} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="cumulativeAbatementTco2e"
              name="Cumulative abatement"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatNumber(value)}
              label={{ value: 'Cumulative abatement to 2050', position: 'insideBottom', offset: -8 }}
            />
            <YAxis
              type="number"
              dataKey="netPresentCostUsd"
              name="Net present cost"
              tick={{ fontSize: 12 }}
              tickFormatter={formatCompactCurrency}
              width={86}
            />
            <ReferenceLine y={0} stroke="#253746" strokeOpacity={0.5} strokeWidth={1.2} />
            <ZAxis type="number" dataKey="annualEmissionsReductionTco2e" range={[110, 620]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const row = payload[0].payload
                return (
                  <div className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-soft">
                    <p className="font-semibold text-shi-blue">{row.name}</p>
                    <p>Representative year: {row.representativeYear}</p>
                    <p>Capex: {formatCompactCurrency(row.capexUsd)}</p>
                    <p>Annual benefit: {formatCompactCurrency(row.annualNetBenefitUsd)}</p>
                    <p>MAC: {formatCurrency(row.grossMacUsdPerTco2e, 1)} / tCO2e</p>
                    <p>Annual abatement: {formatEmissions(row.annualEmissionsReductionTco2e, 1)}</p>
                    <p>Cumulative abatement: {formatEmissions(row.cumulativeAbatementTco2e, 0)}</p>
                    <p>Net present cost: {formatCompactCurrency(row.netPresentCostUsd)}</p>
                  </div>
                )
              }}
            />
            <Scatter name="Measures" data={data}>
              {data.map((row) => (
                <Cell
                  key={row.name}
                  fill={row.netPresentCostUsd <= 0 ? '#06B2B1' : '#FF6D15'}
                  fillOpacity={0.82}
                  stroke={row.netPresentCostUsd <= 0 ? '#047C7B' : '#A84309'}
                  strokeWidth={1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        )}
      </ChartFrame>
    </section>
  )
}

import clsx from 'clsx'
import { calculateFinanceSummary } from '../lib/maccEngine'
import { Field, NumberInput, PercentInput } from './Field'
import MetricCard from './MetricCard'
import MaccChart from './MaccChart'
import BubbleInvestmentMap from './BubbleInvestmentMap'
import ScenarioSelector from './ScenarioSelector'
import {
  formatCompactCurrency,
  formatCurrency,
  formatEmissions,
  formatPayback,
} from '../lib/formatters'

export default function MaccFinanceView({
  state,
  financeRows,
  scenarioComparisons,
  onSelectScenario,
  onUpdateCarbonPrice,
  onUpdateDiscountRate,
  onUpdateMaccView,
}) {
  const summary = calculateFinanceSummary(financeRows)
  const macKey = state.maccView === 'adjusted' ? 'adjustedMacUsdPerTco2e' : 'grossMacUsdPerTco2e'

  return (
    <div className="space-y-5">
      <section className="panel">
        <div className="section-heading">
          <p>Finance controls</p>
          <span>Scenario, carbon price and discount rate</span>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_170px_170px_240px]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Scenario</p>
            <ScenarioSelector
              scenarios={state.scenarios}
              selectedScenarioId={state.selectedScenarioId}
              onSelect={onSelectScenario}
            />
          </div>
          <Field
            label="Carbon price"
            tooltip="Internal carbon price in USD per tCO2e, used for carbon value and adjusted MAC."
          >
            <NumberInput
              value={state.internalCarbonPriceUsdPerTco2e}
              min={0}
              step={5}
              onChange={onUpdateCarbonPrice}
            />
          </Field>
          <Field label="Discount rate" tooltip="Rate used to annualise capex for MAC calculations.">
            <PercentInput
              value={state.discountRate}
              min={0}
              max={25}
              onChange={onUpdateDiscountRate}
            />
          </Field>
          <div>
            <Field
              label="MAC view"
              tooltip="Gross MAC excludes carbon price value; adjusted MAC includes it."
            >
              <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
                {[
                  ['gross', 'Gross MAC'],
                  ['adjusted', 'Adjusted MAC'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={clsx(
                      'flex-1 rounded px-3 py-2 text-sm font-semibold',
                      state.maccView === id ? 'bg-white text-shi-accent shadow-sm' : 'text-slate-600',
                    )}
                    onClick={() => onUpdateMaccView(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total capex" value={formatCompactCurrency(summary.totalCapexUsd)} />
        <MetricCard
          label="Avoided energy cost"
          value={formatCompactCurrency(summary.totalAvoidedEnergyCostUsd)}
          tone="success"
        />
        <MetricCard
          label="Annual tCO2e reduction"
          value={formatEmissions(summary.totalAnnualReductionTco2e, 1)}
        />
        <MetricCard
          label="Carbon price value"
          value={formatCompactCurrency(summary.internalCarbonPriceValueUsd)}
        />
        <MetricCard
          label="Annual opex change"
          value={formatCompactCurrency(summary.totalAnnualOpexChangeUsd)}
        />
        <MetricCard
          label="Average cost per tCO2e"
          value={formatCurrency(summary.averageCostPerTco2e)}
        />
        <MetricCard
          label="Weighted payback"
          value={formatPayback(summary.weightedAveragePaybackYears)}
        />
        <MetricCard label="Measures in view" value={String(financeRows.length)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <MaccChart rows={financeRows} view={state.maccView} />
        <BubbleInvestmentMap rows={financeRows} />
      </div>

      <section className="panel overflow-hidden">
        <div className="section-heading">
          <p>Scenario comparison</p>
          <span>2030 and 2050 portfolio outcomes</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>2030 emissions</th>
                <th>2050 emissions</th>
                <th>Annual cost in 2030</th>
                <th>Total capex</th>
                <th>Annual reduction</th>
              </tr>
            </thead>
            <tbody>
              {scenarioComparisons.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold text-shi-blue">{row.name}</td>
                  <td>{formatEmissions(row.emissions2030)}</td>
                  <td>{formatEmissions(row.emissions2050)}</td>
                  <td>{formatCompactCurrency(row.cost2030)}</td>
                  <td>{formatCompactCurrency(row.capexUsd)}</td>
                  <td>{formatEmissions(row.annualReduction2030, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="section-heading">
          <p>Measure finance table</p>
          <span>Representative annual values</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data-table min-w-[1100px]">
            <thead>
              <tr>
                <th>Measure</th>
                <th>Year</th>
                <th>Capex</th>
                <th>Annual saving</th>
                <th>Carbon value</th>
                <th>Annual benefit</th>
                <th>MAC</th>
                <th>Cumulative abatement</th>
                <th>Payback</th>
              </tr>
            </thead>
            <tbody>
              {financeRows.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold text-shi-blue">{row.name}</td>
                  <td>{row.representativeYear}</td>
                  <td>{formatCompactCurrency(row.capexUsd)}</td>
                  <td>{formatCurrency(row.annualAvoidedEnergyCostUsd)}</td>
                  <td>{formatCurrency(row.carbonPriceValueUsd)}</td>
                  <td>{formatCurrency(row.annualNetBenefitUsd)}</td>
                  <td>{formatCurrency(row[macKey] ?? 0)}</td>
                  <td>{formatEmissions(row.cumulativeAbatementTco2e, 0)}</td>
                  <td>{formatPayback(row.simplePaybackYears)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

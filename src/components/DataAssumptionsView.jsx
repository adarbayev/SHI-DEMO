import {
  formatCurrency,
  formatEmissions,
  formatMwh,
  formatNumber,
  formatPercent,
} from '../lib/formatters'
import { normaliseTargetSettings } from '../lib/targetEngine'
import AssumptionsTable from './AssumptionsTable'

export default function DataAssumptionsView({ state, baselineRowsWithEmissions }) {
  const startYear = state.bauAssumptions.startYear
  const factorRows = Object.entries(state.emissionFactors.electricityLocationBased).map(
    ([country, values]) => ({
      country,
      factor: values[startYear] ?? values[2026],
      gridDecline:
        state.emissionFactors.countryGridDecarbonisationRates[country] ??
        state.bauAssumptions.gridDecarbonisationRate,
    }),
  )

  const fuelRows = [
    { fuel: 'Natural gas', factor: state.emissionFactors.fuels.naturalGasTco2ePerMWh },
    { fuel: 'Diesel', factor: state.emissionFactors.fuels.dieselTco2ePerMWh },
    { fuel: 'Petrol', factor: state.emissionFactors.fuels.petrolTco2ePerMWh },
  ]
  const targetRows = normaliseTargetSettings(state.targetSettings).scopeTargets
  const financeRows = state.baselineEnergy.map((row) => ({
    ...row,
    siteName: state.sites.find((site) => site.id === row.siteId)?.name ?? row.siteId,
  }))
  const operationalRowsForBaselineYear = state.operationalMonthlyData.filter(
    (row) => row.year === startYear,
  )
  const operationalSources = [
    ...new Set(state.operationalMonthlyData.map((row) => row.sourceSystem)),
  ].join(' | ')
  const latestOperationalPeriod = state.operationalMonthlyData.reduce(
    (latest, row) => {
      if (row.year > latest.year || (row.year === latest.year && row.month > latest.month)) {
        return { year: row.year, month: row.month }
      }
      return latest
    },
    { year: 0, month: 0 },
  )
  const operationalTotalEnergy = operationalRowsForBaselineYear.reduce(
    (sum, row) => sum + row.electricityMWh + row.naturalGasMWh + row.dieselMWh + row.petrolMWh,
    0,
  )
  const baselineTotalEnergy = state.baselineEnergy.reduce(
    (sum, row) => sum + row.electricityMWh + row.naturalGasMWh + row.dieselMWh + row.petrolMWh,
    0,
  )
  const operationalElectricity = operationalRowsForBaselineYear.reduce(
    (sum, row) => sum + row.electricityMWh,
    0,
  )
  const baselineElectricity = state.baselineEnergy.reduce(
    (sum, row) => sum + row.electricityMWh,
    0,
  )
  const operationalReconciliationRows = [
    {
      metric: 'Total energy',
      operational: operationalTotalEnergy,
      scenario: baselineTotalEnergy,
      delta:
        Math.abs(operationalTotalEnergy - baselineTotalEnergy) < 0.001
          ? 0
          : operationalTotalEnergy - baselineTotalEnergy,
    },
    {
      metric: 'Electricity',
      operational: operationalElectricity,
      scenario: baselineElectricity,
      delta:
        Math.abs(operationalElectricity - baselineElectricity) < 0.001
          ? 0
          : operationalElectricity - baselineElectricity,
    },
  ]

  return (
    <div className="space-y-5">
      <section className="panel">
        <div className="section-heading">
          <p>Operational data layer</p>
          <span>Monthly seeded data feeding live dashboard</span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-3 text-sm text-slate-600">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Data grain</p>
              <p className="mt-1 font-semibold text-shi-blue">Monthly | 2023-2025</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Latest period</p>
              <p className="mt-1 font-semibold text-shi-blue">
                {latestOperationalPeriod.year}-{String(latestOperationalPeriod.month).padStart(2, '0')}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Source systems</p>
              <p className="mt-1 text-slate-600">{operationalSources}</p>
            </div>
          </div>
          <AssumptionsTable
            columns={[
              { key: 'metric', label: 'Metric' },
              {
                key: 'operational',
                label: `${startYear} operational aggregate`,
                render: (row) => formatMwh(row.operational),
              },
              {
                key: 'scenario',
                label: 'Scenario baseline',
                render: (row) => formatMwh(row.scenario),
              },
              { key: 'delta', label: 'Delta', render: (row) => formatMwh(row.delta) },
            ]}
            rows={operationalReconciliationRows}
          />
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p>Site list</p>
          <span>Operational baseline architecture</span>
        </div>
        <div className="mt-4">
          <AssumptionsTable
            columns={[
              { key: 'name', label: 'Site' },
              { key: 'country', label: 'Country' },
              { key: 'region', label: 'Region' },
              { key: 'archetype', label: 'Archetype' },
              { key: 'operationalControl', label: 'Control' },
              { key: 'hasBms', label: 'BMS', render: (row) => (row.hasBms ? 'Yes' : 'No') },
              { key: 'hasDcim', label: 'DCIM', render: (row) => (row.hasDcim ? 'Yes' : 'No') },
              { key: 'hasSolar', label: 'Solar', render: (row) => (row.hasSolar ? 'Yes' : 'No') },
            ]}
            rows={state.sites}
          />
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p>Baseline energy and emissions</p>
          <span>{startYear} simulation start</span>
        </div>
        <div className="mt-4">
          <AssumptionsTable
            columns={[
              { key: 'siteName', label: 'Site' },
              { key: 'electricityMWh', label: 'Electricity', render: (row) => formatMwh(row.electricityMWh) },
              { key: 'naturalGasMWh', label: 'Natural gas', render: (row) => formatMwh(row.naturalGasMWh) },
              { key: 'dieselMWh', label: 'Diesel', render: (row) => formatMwh(row.dieselMWh) },
              { key: 'petrolMWh', label: 'Petrol', render: (row) => formatMwh(row.petrolMWh) },
              { key: 'energyCostUsd', label: 'Energy cost', render: (row) => formatCurrency(row.energyCostUsd) },
              { key: 'totalEmissionsTco2e', label: 'Emissions', render: (row) => formatEmissions(row.totalEmissionsTco2e, 1) },
            ]}
            rows={baselineRowsWithEmissions}
          />
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p>Energy finance assumptions</p>
          <span>Tariff and contract context</span>
        </div>
        <div className="mt-4">
          <AssumptionsTable
            columns={[
              { key: 'siteName', label: 'Site' },
              { key: 'tariffLabel', label: 'Tariff label' },
              { key: 'contractType', label: 'Contract type' },
              {
                key: 'peakDemandKw',
                label: 'Peak demand',
                render: (row) => `${formatNumber(row.peakDemandKw)} kW`,
              },
              {
                key: 'demandChargeUsdPerKwMonth',
                label: 'Demand charge',
                render: (row) => `${formatCurrency(row.demandChargeUsdPerKwMonth, 1)} / kW-mo`,
              },
              {
                key: 'fixedAnnualUtilityChargeUsd',
                label: 'Fixed annual charge',
                render: (row) => formatCurrency(row.fixedAnnualUtilityChargeUsd),
              },
              {
                key: 'ppaEligibilityPercent',
                label: 'PPA eligibility',
                render: (row) => formatPercent(row.ppaEligibilityPercent),
              },
              { key: 'financeNotes', label: 'Finance notes' },
            ]}
            rows={financeRows}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel">
          <div className="section-heading">
            <p>Electricity factors</p>
            <span>Location-based tCO2e/MWh</span>
          </div>
          <div className="mt-4">
            <AssumptionsTable
              columns={[
                { key: 'country', label: 'Country' },
                { key: 'factor', label: `${startYear} factor` },
                { key: 'gridDecline', label: 'Default grid decline', render: (row) => formatPercent(row.gridDecline) },
              ]}
              rows={factorRows}
            />
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <p>Fuel factors</p>
            <span>Scope 1 tCO2e/MWh</span>
          </div>
          <div className="mt-4">
            <AssumptionsTable
              columns={[
                { key: 'fuel', label: 'Fuel' },
                { key: 'factor', label: 'Factor' },
              ]}
              rows={fuelRows}
            />
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <p>Target assumptions</p>
          <span>SBTi scope records</span>
        </div>
        <div className="mt-4">
          <AssumptionsTable
            columns={[
              { key: 'scopeLabel', label: 'Scope' },
              { key: 'horizonLabel', label: 'Horizon' },
              {
                key: 'modeled',
                label: 'Status',
                render: (row) => (row.modeled ? 'Modelled' : 'Placeholder'),
              },
              { key: 'baselineYear', label: 'Baseline year' },
              {
                key: 'baselineEmissionsTco2e',
                label: 'Baseline emissions',
                render: (row) => formatEmissions(row.baselineEmissionsTco2e),
              },
              { key: 'targetYear', label: 'Target year' },
              {
                key: 'reductionPercent',
                label: 'Reduction',
                render: (row) => formatPercent(row.reductionPercent / 100),
              },
              {
                key: 'targetEmissionsTco2e',
                label: 'Target emissions',
                render: (row) => formatEmissions(row.targetEmissionsTco2e),
              },
            ]}
            rows={targetRows}
          />
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p>Methodology notes</p>
          <span>MVP calculation basis</span>
        </div>
        <div className="mt-4 grid gap-4 text-sm text-shi-blue md:grid-cols-2">
          <p>
            BAU energy uses annual demand growth plus any site expansion factor. Unit costs grow by
            the energy price escalation rate.
          </p>
          <p>
            Scope 2 location-based emissions use seeded country electricity factors and an annual
            grid-decarbonisation decline. Scope 1 fuels use fixed seeded fuel factors.
          </p>
          <p>
            Measures target a specific energy indicator, phase in from their start year and stop at
            the end of useful life. Solar reduces purchased electricity. Electrification reduces fuel
            and adds electricity demand using the seeded efficiency ratio.
          </p>
          <p>
            Finance outputs use avoided energy cost, annual opex change, optional internal carbon
            price value, simple payback, annualised capex and marginal abatement cost.
          </p>
          <p>
            Target pathway outputs sum modelled Scope 1 and Scope 2 target records. Scope 3 target
            rows are retained as placeholders until Scope 3 activity data is added.
          </p>
        </div>
      </section>
    </div>
  )
}

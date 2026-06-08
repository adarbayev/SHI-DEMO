import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  enrichOperationalRows,
  getFuelMixRows,
  getHotspotRows,
  getMapSiteRows,
  getMonthlyElectricityTrend,
  getOperationalKpis,
  getYearlySiteRows,
} from '../lib/operationalEngine'
import {
  formatCurrency,
  formatEmissions,
  formatMwh,
  formatNumber,
  formatPercent,
} from '../lib/formatters'
import AssumptionsTable from './AssumptionsTable'
import ChartFrame from './ChartFrame'
import MetricCard from './MetricCard'
import SiteOperationsMap from './SiteOperationsMap'

function axisMwh(value) {
  return formatNumber(value)
}

function ChartPanel({ title, subtitle, children, height = 280 }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <p>{title}</p>
        <span>{subtitle}</span>
      </div>
      <ChartFrame className="mt-4" style={{ height }}>
        {children}
      </ChartFrame>
    </section>
  )
}

function ElectricityTrendChart({ data }) {
  return (
    <ChartPanel title="Monthly electricity" subtitle="2023-2025 consumption" height={280}>
      {({ width, height }) => (
        <LineChart width={width} height={height} data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} interval={5} />
          <YAxis tick={{ fontSize: 11 }} width={66} tickFormatter={axisMwh} />
          <Tooltip formatter={(value) => [formatMwh(value, 1), 'Electricity']} />
          <Line type="monotone" dataKey="electricityMWh" stroke="#1C64A5" strokeWidth={2} dot={false} />
        </LineChart>
      )}
    </ChartPanel>
  )
}

function AnnualEnergyChart({ data, selectedSite }) {
  return (
    <ChartPanel
      title={selectedSite ? 'Annual site energy' : 'Annual energy by site'}
      subtitle={selectedSite ? selectedSite.siteShortName : 'Latest year by operational site'}
      height={280}
    >
      {({ width, height }) => (
        <BarChart width={width} height={height} data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={66} tickFormatter={axisMwh} />
          <Tooltip formatter={(value) => [formatMwh(value, 1), 'Total energy']} />
          <Bar dataKey="totalEnergyMWh" fill="#06B2B1" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ChartPanel>
  )
}

function FuelMixChart({ data }) {
  return (
    <ChartPanel title="Fuel mix" subtitle="Annual energy by fuel type" height={280}>
      {({ width, height }) => (
        <BarChart width={width} height={height} data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={66} tickFormatter={axisMwh} />
          <Tooltip formatter={(value) => [formatMwh(value, 1), '']} />
          <Legend />
          <Bar dataKey="electricityMWh" name="Electricity" stackId="energy" fill="#1C64A5" />
          <Bar dataKey="naturalGasMWh" name="Natural gas" stackId="energy" fill="#253746" />
          <Bar dataKey="dieselMWh" name="Diesel" stackId="energy" fill="#FF6D15" />
          <Bar dataKey="petrolMWh" name="Petrol" stackId="energy" fill="#ACAFBC" />
        </BarChart>
      )}
    </ChartPanel>
  )
}

function TopEmissionsChart({ data }) {
  return (
    <ChartPanel title="Hotspot emissions" subtitle="Latest-year Scope 1 + Scope 2" height={280}>
      {({ width, height }) => (
        <BarChart layout="vertical" width={width} height={height} data={data} margin={{ top: 10, right: 24, left: 24, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={axisMwh} />
          <YAxis type="category" dataKey="siteShortName" tick={{ fontSize: 11 }} width={86} />
          <Tooltip formatter={(value) => [formatEmissions(value, 1), 'Emissions']} />
          <Bar dataKey="totalEmissionsTco2e" fill="#FF6D15" radius={[0, 4, 4, 0]} />
        </BarChart>
      )}
    </ChartPanel>
  )
}

function buildAnnualChartRows(yearlySiteRows, latestYear, selectedSite) {
  if (selectedSite) {
    return yearlySiteRows
      .filter((row) => row.siteId === selectedSite.id)
      .sort((a, b) => a.year - b.year)
      .map((row) => ({ ...row, label: String(row.year) }))
  }

  return yearlySiteRows
    .filter((row) => row.year === latestYear)
    .sort((a, b) => b.totalEnergyMWh - a.totalEnergyMWh)
    .map((row) => ({ ...row, label: row.siteShortName }))
}

export default function OperationalDashboardView({ state }) {
  const [selectedSiteId, setSelectedSiteId] = useState(null)
  const selectedSite = state.sites.find((site) => site.id === selectedSiteId) ?? null

  const enrichedRows = useMemo(
    () =>
      enrichOperationalRows({
        rows: state.operationalMonthlyData,
        sites: state.sites,
        assumptions: state.bauAssumptions,
        emissionFactors: state.emissionFactors,
      }),
    [state.operationalMonthlyData, state.sites, state.bauAssumptions, state.emissionFactors],
  )

  const filteredRows = useMemo(
    () =>
      selectedSiteId
        ? enrichedRows.filter((row) => row.siteId === selectedSiteId)
        : enrichedRows,
    [enrichedRows, selectedSiteId],
  )

  const mapSiteRows = useMemo(() => getMapSiteRows(enrichedRows), [enrichedRows])
  const kpis = useMemo(() => getOperationalKpis(filteredRows), [filteredRows])
  const monthlyTrend = useMemo(() => getMonthlyElectricityTrend(filteredRows), [filteredRows])
  const fuelMixRows = useMemo(() => getFuelMixRows(filteredRows), [filteredRows])
  const yearlySiteRows = useMemo(() => getYearlySiteRows(enrichedRows), [enrichedRows])
  const annualChartRows = useMemo(
    () => buildAnnualChartRows(yearlySiteRows, kpis.latest.year, selectedSite),
    [yearlySiteRows, kpis.latest.year, selectedSite],
  )
  const hotspotRows = useMemo(
    () => getHotspotRows(filteredRows, kpis.latest.year),
    [filteredRows, kpis.latest.year],
  )
  const topEmissionsRows = useMemo(
    () => getHotspotRows(enrichedRows, kpis.latest.year).slice(0, 5),
    [enrichedRows, kpis.latest.year],
  )

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <section className="panel">
          <div className="section-heading">
            <p>Operational site map</p>
            <span>{selectedSite ? selectedSite.name : 'All sites'} | {kpis.latest.year}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={selectedSiteId ? 'btn-secondary' : 'btn-primary'}
              onClick={() => setSelectedSiteId(null)}
            >
              All sites
            </button>
            {state.sites.map((site) => (
              <button
                key={site.id}
                type="button"
                className={selectedSiteId === site.id ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setSelectedSiteId(site.id)}
              >
                {site.siteShortName}
              </button>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <SiteOperationsMap
              siteRows={mapSiteRows}
              selectedSiteId={selectedSiteId}
              onSelectSite={setSelectedSiteId}
            />
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <MetricCard
            label="Latest period energy"
            value={formatMwh(kpis.latestPeriod.totalEnergyMWh, 1)}
            detail={kpis.latest.period}
            tone="accent"
          />
          <MetricCard
            label="Electricity"
            value={formatMwh(kpis.latestPeriod.electricityMWh, 1)}
            detail={`YoY energy ${formatPercent(kpis.yoyEnergyChange)}`}
          />
          <MetricCard
            label="Energy cost"
            value={formatCurrency(kpis.latestPeriod.energyCostUsd)}
            detail="Latest reported month"
          />
          <MetricCard
            label="Scope 1 + 2 emissions"
            value={formatEmissions(kpis.latestPeriod.totalEmissionsTco2e, 1)}
            detail="Location-based"
            tone="risk"
          />
          <MetricCard
            label="Renewable electricity match"
            value={formatPercent(kpis.latestPeriod.renewableElectricityMatchedPercent)}
            detail="Weighted by electricity"
            tone="success"
          />
          <MetricCard
            label="Top hotspot"
            value={kpis.topHotspot?.siteShortName ?? 'n/a'}
            detail={kpis.topHotspot ? formatEmissions(kpis.topHotspot.totalEmissionsTco2e, 1) : ''}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <ElectricityTrendChart data={monthlyTrend} />
        <AnnualEnergyChart data={annualChartRows} selectedSite={selectedSite} />
        <FuelMixChart data={fuelMixRows} />
        <TopEmissionsChart data={topEmissionsRows} />
      </div>

      <section className="panel">
        <div className="section-heading">
          <p>Cost and emissions hotspot ranking</p>
          <span>{selectedSite ? selectedSite.name : 'All sites'} | {kpis.latest.year}</span>
        </div>
        <div className="mt-4">
          <AssumptionsTable
            columns={[
              { key: 'rank', label: 'Rank' },
              { key: 'siteName', label: 'Site' },
              { key: 'hotspotTier', label: 'Tier' },
              { key: 'totalEnergyMWh', label: 'Energy', render: (row) => formatMwh(row.totalEnergyMWh, 1) },
              { key: 'electricityShare', label: 'Electricity share', render: (row) => formatPercent(row.electricityShare) },
              { key: 'energyCostUsd', label: 'Energy cost', render: (row) => formatCurrency(row.energyCostUsd) },
              { key: 'totalEmissionsTco2e', label: 'Emissions', render: (row) => formatEmissions(row.totalEmissionsTco2e, 1) },
            ]}
            rows={hotspotRows}
          />
        </div>
      </section>
    </div>
  )
}

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  BadgeDollarSign,
  Flame,
  Gauge,
  MapPinned,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
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

function tileToneClass(tone) {
  if (tone === 'accent') return 'border-shi-accent/30 bg-gradient-to-br from-white to-blue-50/70'
  if (tone === 'risk') return 'border-shi-orange/35 bg-gradient-to-br from-white to-orange-50/70'
  if (tone === 'success') return 'border-shi-teal/35 bg-gradient-to-br from-white to-teal-50/70'
  return 'border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80'
}

function iconToneClass(tone) {
  if (tone === 'risk') return 'bg-shi-orange/10 text-shi-orange'
  if (tone === 'success') return 'bg-shi-teal/10 text-shi-teal'
  if (tone === 'accent') return 'bg-shi-accent/10 text-shi-accent'
  return 'bg-slate-100 text-slate-500'
}

function DashboardKpiTile({ label, value, detail, tone = 'default', icon: Icon }) {
  return (
    <div className={clsx('surface-card rounded-md p-3 transition hover:-translate-y-0.5', tileToneClass(tone))}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase leading-tight text-slate-500">{label}</p>
        {Icon ? (
          <span className={clsx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md', iconToneClass(tone))}>
            <Icon size={16} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 break-words text-xl font-semibold leading-tight text-shi-blue">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-snug text-slate-500">{detail}</p> : null}
    </div>
  )
}

function InsightTile({ label, value, detail, tone = 'default', icon: Icon }) {
  return (
    <div className={clsx('surface-card rounded-md p-3', tileToneClass(tone))}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className={clsx('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md', iconToneClass(tone))}>
            <Icon size={16} aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase leading-tight text-slate-500">{label}</p>
          <p className="mt-1 break-words text-lg font-semibold leading-tight text-shi-blue">{value}</p>
          <p className="mt-1 text-xs leading-snug text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  )
}

function signedPercent(value) {
  const formatted = formatPercent(Math.abs(value))
  if (!Number.isFinite(value) || value === 0) return formatted
  return `${value > 0 ? '+' : '-'}${formatted}`
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
  const allHotspotRows = useMemo(
    () => getHotspotRows(enrichedRows, kpis.latest.year),
    [enrichedRows, kpis.latest.year],
  )
  const topEmissionsRows = useMemo(
    () => allHotspotRows.slice(0, 5),
    [allHotspotRows],
  )
  const latestYearSummary = useMemo(
    () => fuelMixRows.find((row) => row.year === kpis.latest.year) ?? null,
    [fuelMixRows, kpis.latest.year],
  )
  const selectedHotspotRow = selectedSiteId
    ? allHotspotRows.find((row) => row.siteId === selectedSiteId)
    : allHotspotRows[0]
  const allLatestYearEmissions = allHotspotRows.reduce(
    (sum, row) => sum + row.totalEmissionsTco2e,
    0,
  )
  const latestPeriodElectricityShare =
    kpis.latestPeriod.totalEnergyMWh > 0
      ? kpis.latestPeriod.electricityMWh / kpis.latestPeriod.totalEnergyMWh
      : 0
  const annualElectricityShare =
    latestYearSummary?.totalEnergyMWh > 0
      ? latestYearSummary.electricityMWh / latestYearSummary.totalEnergyMWh
      : 0
  const annualCostIntensity =
    latestYearSummary?.totalEnergyMWh > 0
      ? latestYearSummary.energyCostUsd / latestYearSummary.totalEnergyMWh
      : 0
  const hotspotConcentration =
    allLatestYearEmissions > 0 && selectedHotspotRow
      ? selectedHotspotRow.totalEmissionsTco2e / allLatestYearEmissions
      : 0
  const energyMovementTone =
    kpis.yoyEnergyChange > 0.03 ? 'risk' : kpis.yoyEnergyChange < 0 ? 'success' : 'default'

  return (
    <div className="space-y-5">
      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.28fr)_minmax(360px,0.72fr)]">
        <section className="panel h-fit">
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
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/75 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-shi-orange" /> High hotspot
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/75 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-shi-teal" /> Medium
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/75 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-shi-lime" /> Watch
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-shi-accent/30 bg-shi-accent/5 px-2.5 py-1 text-shi-blue">
              <span className="h-2.5 w-2.5 rounded-full bg-shi-accent" /> Selected site
            </span>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <DashboardKpiTile
            label="Latest period energy"
            value={formatMwh(kpis.latestPeriod.totalEnergyMWh, 1)}
            detail={`${kpis.latest.period} reported period`}
            tone="accent"
            icon={Gauge}
          />
          <DashboardKpiTile
            label="Electricity"
            value={formatMwh(kpis.latestPeriod.electricityMWh, 1)}
            detail={`Period share ${formatPercent(latestPeriodElectricityShare)}`}
            icon={Zap}
          />
          <DashboardKpiTile
            label="Energy cost"
            value={formatCurrency(kpis.latestPeriod.energyCostUsd)}
            detail={`${formatCurrency(annualCostIntensity, 0)}/MWh annual intensity`}
            icon={BadgeDollarSign}
          />
          <DashboardKpiTile
            label="Scope 1 + 2 emissions"
            value={formatEmissions(kpis.latestPeriod.totalEmissionsTco2e, 1)}
            detail="Location-based"
            tone="risk"
            icon={Flame}
          />
          <DashboardKpiTile
            label="Renewable electricity match"
            value={formatPercent(kpis.latestPeriod.renewableElectricityMatchedPercent)}
            detail="Weighted by electricity"
            tone="success"
            icon={TrendingDown}
          />
          <DashboardKpiTile
            label="Top hotspot"
            value={kpis.topHotspot?.siteShortName ?? 'n/a'}
            detail={kpis.topHotspot ? formatEmissions(kpis.topHotspot.totalEmissionsTco2e, 1) : ''}
            icon={MapPinned}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InsightTile
          label="Annual energy movement"
          value={signedPercent(kpis.yoyEnergyChange)}
          detail={`${kpis.latest.year} versus ${kpis.latest.year - 1}`}
          tone={energyMovementTone}
          icon={kpis.yoyEnergyChange > 0 ? TrendingUp : TrendingDown}
        />
        <InsightTile
          label="Electricity dependency"
          value={formatPercent(annualElectricityShare)}
          detail={`${selectedSite ? selectedSite.siteShortName : 'Portfolio'} annual energy mix`}
          tone="accent"
          icon={Zap}
        />
        <InsightTile
          label="Cost intensity"
          value={`${formatCurrency(annualCostIntensity, 0)}/MWh`}
          detail={`${kpis.latest.year} blended energy cost`}
          icon={BadgeDollarSign}
        />
        <InsightTile
          label="Hotspot concentration"
          value={formatPercent(hotspotConcentration)}
          detail={`${selectedHotspotRow?.siteShortName ?? 'Top site'} share of portfolio emissions`}
          tone="risk"
          icon={Flame}
        />
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

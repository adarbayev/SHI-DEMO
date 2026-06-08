import { useMemo, useState } from 'react'
import { LayoutGrid, Plus, Search, Table2 } from 'lucide-react'
import MetricCard from './MetricCard'
import MeasureForm from './MeasureForm'
import MeasureKanbanBoard from './MeasureKanbanBoard'
import MeasurePortfolioTable from './MeasurePortfolioTable'
import ModalShell from './ModalShell'
import { formatCompactCurrency, formatEmissions, formatNumber } from '../lib/formatters'
import {
  getMeasureProgress,
  measureStatusOptions,
  normaliseMeasureStatus,
} from '../lib/measureWorkflow'

const allOption = 'all'

function normaliseSearch(value) {
  return value.trim().toLowerCase()
}

export default function MeasurePlannerView({
  state,
  financeRowsByScenario,
  onAddMeasure,
  onUpdateMeasure,
  onDuplicateMeasure,
  onDeleteMeasure,
  onAdvanceWorkflow,
}) {
  const [viewMode, setViewMode] = useState('kanban')
  const [filters, setFilters] = useState({
    scenarioId: allOption,
    siteId: allOption,
    status: allOption,
    query: '',
  })
  const [editingMeasureId, setEditingMeasureId] = useState(null)
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false)
  const editingMeasure = state.measures.find((measure) => measure.id === editingMeasureId)

  const financeRows = useMemo(() => Object.values(financeRowsByScenario).flat(), [financeRowsByScenario])
  const financeByMeasure = useMemo(
    () => new Map(financeRows.map((row) => [row.id, row])),
    [financeRows],
  )
  const siteById = useMemo(() => new Map(state.sites.map((site) => [site.id, site])), [state.sites])
  const scenarioById = useMemo(
    () => new Map(state.scenarios.map((scenario) => [scenario.id, scenario])),
    [state.scenarios],
  )

  const filteredMeasures = useMemo(() => {
    const query = normaliseSearch(filters.query)
    return state.measures.filter((measure) => {
      const status = normaliseMeasureStatus(measure.status)
      if (filters.scenarioId !== allOption && measure.scenarioId !== filters.scenarioId) return false
      if (filters.siteId !== allOption && measure.siteId !== filters.siteId) return false
      if (filters.status !== allOption && status !== filters.status) return false
      if (!query) return true
      const site = siteById.get(measure.siteId)
      const scenario = scenarioById.get(measure.scenarioId)
      const haystack = [
        measure.name,
        measure.category,
        measure.owner,
        measure.nextAction,
        site?.name,
        site?.siteShortName,
        scenario?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [filters, state.measures, siteById, scenarioById])

  const impact = useMemo(
    () => {
      const selectedFinanceRows = filteredMeasures
        .map((measure) => financeByMeasure.get(measure.id))
        .filter(Boolean)
      return {
        capex: filteredMeasures.reduce((sum, measure) => sum + measure.capexUsd, 0),
        reduction: selectedFinanceRows.reduce(
          (sum, row) => sum + row.annualEmissionsReductionTco2e,
          0,
        ),
        savings: selectedFinanceRows.reduce((sum, row) => sum + row.annualAvoidedEnergyCostUsd, 0),
        awaitingValidation: filteredMeasures.filter(
          (measure) => normaliseMeasureStatus(measure.status) === 'validation_requested',
        ).length,
        deliveryStage: filteredMeasures.filter((measure) =>
          ['validated', 'in_progress', 'completed'].includes(normaliseMeasureStatus(measure.status)),
        ).length,
        averageProgress: filteredMeasures.length
          ? filteredMeasures.reduce((sum, measure) => sum + getMeasureProgress(measure), 0) /
            filteredMeasures.length
          : 0,
      }
    },
    [filteredMeasures, financeByMeasure],
  )

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function submitMeasure(measure) {
    if (editingMeasureId) {
      onUpdateMeasure(measure)
      setEditingMeasureId(null)
    } else {
      onAddMeasure(measure)
    }
    setIsMeasureModalOpen(false)
  }

  function openNewMeasure() {
    setEditingMeasureId(null)
    setIsMeasureModalOpen(true)
  }

  function openExistingMeasure(measureId) {
    setEditingMeasureId(measureId)
    setIsMeasureModalOpen(true)
  }

  function deleteFromModal(measureId) {
    onDeleteMeasure(measureId)
    setEditingMeasureId(null)
    setIsMeasureModalOpen(false)
  }

  return (
    <>
      <main className="space-y-5">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p>Measure collaboration workspace</p>
              <span>Portfolio workflow across scenarios, sites and responsible owners</span>
            </div>
            <button type="button" className="btn-primary" onClick={openNewMeasure}>
              <Plus size={16} />
              Add measure
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">Scenario</span>
                <select
                  className="input mt-1"
                  value={filters.scenarioId}
                  onChange={(event) => updateFilter('scenarioId', event.target.value)}
                >
                  <option value={allOption}>All scenarios</option>
                  {state.scenarios
                    .filter((scenario) => scenario.id !== 'bau')
                    .map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">Site</span>
                <select
                  className="input mt-1"
                  value={filters.siteId}
                  onChange={(event) => updateFilter('siteId', event.target.value)}
                >
                  <option value={allOption}>All sites</option>
                  {state.sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">Status</span>
                <select
                  className="input mt-1"
                  value={filters.status}
                  onChange={(event) => updateFilter('status', event.target.value)}
                >
                  <option value={allOption}>All statuses</option>
                  {measureStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">Search</span>
                <span className="relative mt-1 block">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="input pl-9"
                    value={filters.query}
                    placeholder="Measure, site, owner..."
                    onChange={(event) => updateFilter('query', event.target.value)}
                  />
                </span>
              </label>
            </div>

            <div className="inline-flex rounded-md border border-slate-200 bg-white/80 p-1">
              <button
                type="button"
                className={viewMode === 'kanban' ? 'btn-primary min-h-9 px-3 py-1.5' : 'btn-secondary min-h-9 px-3 py-1.5'}
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid size={15} />
                Kanban
              </button>
              <button
                type="button"
                className={viewMode === 'table' ? 'btn-primary min-h-9 px-3 py-1.5' : 'btn-secondary min-h-9 px-3 py-1.5'}
                onClick={() => setViewMode('table')}
              >
                <Table2 size={15} />
                Table
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <MetricCard label="Measures in view" value={formatNumber(filteredMeasures.length)} />
            <MetricCard label="Total capex" value={formatCompactCurrency(impact.capex)} />
            <MetricCard label="Annual savings" value={formatCompactCurrency(impact.savings)} />
            <MetricCard label="Annual reduction" value={formatEmissions(impact.reduction, 1)} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Awaiting validation"
              value={formatNumber(impact.awaitingValidation)}
            />
            <MetricCard label="Delivery stage" value={formatNumber(impact.deliveryStage)} />
            <MetricCard
              label="Average progress"
              value={`${formatNumber(impact.averageProgress, 0)}%`}
            />
          </div>
        </section>

        {viewMode === 'kanban' ? (
          <MeasureKanbanBoard
            measures={filteredMeasures}
            sites={state.sites}
            scenarios={state.scenarios}
            financeRows={financeRows}
            people={state.people}
            onEdit={openExistingMeasure}
            onDuplicate={onDuplicateMeasure}
            onDelete={onDeleteMeasure}
            onAdvanceWorkflow={onAdvanceWorkflow}
          />
        ) : (
          <MeasurePortfolioTable
            measures={filteredMeasures}
            sites={state.sites}
            scenarios={state.scenarios}
            financeRows={financeRows}
            people={state.people}
            onEdit={openExistingMeasure}
            onDuplicate={onDuplicateMeasure}
            onDelete={onDeleteMeasure}
            onAdvanceWorkflow={onAdvanceWorkflow}
          />
        )}
      </main>
      {isMeasureModalOpen ? (
        <ModalShell
          title={editingMeasure ? editingMeasure.name : 'Add Decarbonisation Measure'}
          subtitle="Define ownership, validation, delivery status, impact and finance assumptions."
          size="xl"
          onClose={() => {
            setIsMeasureModalOpen(false)
            setEditingMeasureId(null)
          }}
        >
          <MeasureForm
            key={editingMeasure?.id ?? `new-${state.selectedScenarioId}`}
            sites={state.sites}
            scenarios={state.scenarios}
            people={state.people}
            selectedScenarioId={state.selectedScenarioId}
            editingMeasure={editingMeasure}
            finance={editingMeasure ? financeByMeasure.get(editingMeasure.id) : null}
            onSubmit={submitMeasure}
            onAdvanceWorkflow={onAdvanceWorkflow}
            onCancel={() => {
              setIsMeasureModalOpen(false)
              setEditingMeasureId(null)
            }}
            onDelete={deleteFromModal}
            surface="modal"
            showHeading={false}
          />
        </ModalShell>
      ) : null}
    </>
  )
}

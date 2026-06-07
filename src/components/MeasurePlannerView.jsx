import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import MetricCard from './MetricCard'
import MeasureForm from './MeasureForm'
import MeasurePortfolioTable from './MeasurePortfolioTable'
import ModalShell from './ModalShell'
import ScenarioSelector from './ScenarioSelector'
import { formatCompactCurrency, formatEmissions, formatNumber } from '../lib/formatters'
import { getMeasureProgress } from '../lib/measureWorkflow'

export default function MeasurePlannerView({
  state,
  financeRowsByScenario,
  onSelectScenario,
  onAddMeasure,
  onUpdateMeasure,
  onDuplicateMeasure,
  onDeleteMeasure,
  onSubmitForValidation,
  onValidateMeasure,
}) {
  const [editingMeasureId, setEditingMeasureId] = useState(null)
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false)
  const editingMeasure = state.measures.find((measure) => measure.id === editingMeasureId)
  const selectedMeasures = state.measures.filter(
    (measure) => measure.scenarioId === state.selectedScenarioId,
  )

  const impact = useMemo(
    () => {
      const selectedFinanceRows = financeRowsByScenario[state.selectedScenarioId] ?? []
      return {
        capex: selectedMeasures.reduce((sum, measure) => sum + measure.capexUsd, 0),
        reduction: selectedFinanceRows.reduce(
          (sum, row) => sum + row.annualEmissionsReductionTco2e,
          0,
        ),
        savings: selectedFinanceRows.reduce((sum, row) => sum + row.annualAvoidedEnergyCostUsd, 0),
        awaitingValidation: selectedMeasures.filter(
          (measure) => measure.status === 'validation_requested',
        ).length,
        approvedOrActive: selectedMeasures.filter((measure) =>
          ['approved', 'in_progress', 'implemented'].includes(measure.status),
        ).length,
        averageProgress: selectedMeasures.length
          ? selectedMeasures.reduce((sum, measure) => sum + getMeasureProgress(measure), 0) /
            selectedMeasures.length
          : 0,
      }
    },
    [selectedMeasures, financeRowsByScenario, state.selectedScenarioId],
  )

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
              <p>Scenario impact</p>
              <span>Measure portfolio summary</span>
            </div>
            <button type="button" className="btn-primary" onClick={openNewMeasure}>
              <Plus size={16} />
              Add measure
            </button>
          </div>
          <div className="mt-4">
            <ScenarioSelector
              scenarios={state.scenarios}
              selectedScenarioId={state.selectedScenarioId}
              onSelect={onSelectScenario}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <MetricCard label="Measures" value={formatNumber(selectedMeasures.length)} />
            <MetricCard label="Total capex" value={formatCompactCurrency(impact.capex)} />
            <MetricCard label="Annual savings" value={formatCompactCurrency(impact.savings)} />
            <MetricCard label="Annual reduction" value={formatEmissions(impact.reduction, 1)} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Awaiting validation"
              value={formatNumber(impact.awaitingValidation)}
            />
            <MetricCard label="Approved / active" value={formatNumber(impact.approvedOrActive)} />
            <MetricCard
              label="Average progress"
              value={`${formatNumber(impact.averageProgress, 0)}%`}
            />
          </div>
        </section>
        <MeasurePortfolioTable
          measures={state.measures}
          sites={state.sites}
          scenarios={state.scenarios}
          financeRows={Object.values(financeRowsByScenario).flat()}
          onEdit={openExistingMeasure}
          onDuplicate={onDuplicateMeasure}
          onDelete={onDeleteMeasure}
          onSubmitForValidation={onSubmitForValidation}
          onValidate={onValidateMeasure}
        />
      </main>
      {isMeasureModalOpen ? (
        <ModalShell
          title={editingMeasure ? editingMeasure.name : 'Add Decarbonisation Measure'}
          subtitle="Define the measure target, timing, impact and finance assumptions."
          size="lg"
          onClose={() => {
            setIsMeasureModalOpen(false)
            setEditingMeasureId(null)
          }}
        >
          <MeasureForm
            key={editingMeasure?.id ?? `new-${state.selectedScenarioId}`}
            sites={state.sites}
            scenarios={state.scenarios}
            selectedScenarioId={state.selectedScenarioId}
            editingMeasure={editingMeasure}
            onSubmit={submitMeasure}
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

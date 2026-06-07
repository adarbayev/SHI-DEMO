import { useState } from 'react'
import clsx from 'clsx'
import { Pencil, Settings, Target } from 'lucide-react'
import BauSettingsPanel from './BauSettingsPanel'
import EmissionsTrajectoryChart from './EmissionsTrajectoryChart'
import EnergyCostChart from './EnergyCostChart'
import ModalShell from './ModalShell'
import ScenarioDetailsModal from './ScenarioDetailsModal'
import SummaryCards from './SummaryCards'
import TargetSettingsPanel from './TargetSettingsPanel'
import {
  formatCompactCurrency,
  formatEmissions,
  formatMwh,
  formatPercent,
} from '../lib/formatters'
import { normaliseTargetSettings } from '../lib/targetEngine'

function getYearPoint(projection, year) {
  return projection?.yearly.find((point) => point.year === year) ?? projection?.yearly.at(-1) ?? {}
}

function SetupCard({ icon: Icon, title, eyebrow, children, onEdit }) {
  return (
    <article className="surface-card h-fit rounded-md p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-shi-teal/20 bg-shi-teal/10 text-shi-accent">
            <Icon size={19} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">{eyebrow}</p>
            <h3 className="mt-1 text-base font-semibold text-shi-blue">{title}</h3>
          </div>
        </div>
        <button type="button" className="icon-button" title={`Edit ${title}`} onClick={onEdit}>
          <Pencil size={15} />
        </button>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-600">{children}</div>
    </article>
  )
}

function ScenarioCard({
  scenario,
  projection,
  measures,
  financeRows,
  isSelected,
  onSelect,
  onEdit,
}) {
  const emissions2030 = getYearPoint(projection, 2030).totalEmissionsTco2e ?? 0
  const emissions2050 = getYearPoint(projection, 2050).totalEmissionsTco2e ?? 0
  const capex = measures.reduce((sum, measure) => sum + measure.capexUsd, 0)
  const reduction = financeRows.reduce((sum, row) => sum + row.annualEmissionsReductionTco2e, 0)

  return (
    <article
      className={clsx(
        'surface-card rounded-md p-4',
        isSelected ? 'border-shi-accent ring-2 ring-shi-accent/15' : '',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-shi-blue">{scenario.name}</h3>
            {isSelected ? <span className="status-badge">selected</span> : null}
          </div>
          <p className="mt-2 text-sm text-slate-500">{scenario.description}</p>
        </div>
        <button type="button" className="icon-button" title={`Edit ${scenario.name}`} onClick={onEdit}>
          <Pencil size={15} />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm xl:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">2030 emissions</p>
          <p className="mt-1 font-semibold text-shi-blue">{formatEmissions(emissions2030)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">2050 emissions</p>
          <p className="mt-1 font-semibold text-shi-blue">{formatEmissions(emissions2050)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Measures</p>
          <p className="mt-1 font-semibold text-shi-blue">{measures.length}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Capex</p>
          <p className="mt-1 font-semibold text-shi-blue">{formatCompactCurrency(capex)}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="min-w-0 text-xs font-semibold uppercase text-slate-500">
          {scenario.investmentProfile} | {formatEmissions(reduction, 1)} annual reduction
        </span>
        {scenario.id !== 'bau' && isSelected ? (
          <button type="button" className="btn-secondary cursor-default opacity-70" disabled>
            Selected
          </button>
        ) : null}
        {scenario.id !== 'bau' && !isSelected ? (
          <button type="button" className="btn-secondary" onClick={onSelect}>
            Select
          </button>
        ) : null}
      </div>
    </article>
  )
}

export default function ScenarioSetupView({
  state,
  projections,
  trajectoryData,
  costData,
  targetPathway,
  selectedFinanceRows,
  financeRowsByScenario,
  onUpdateBau,
  onUpdateTarget,
  onUpdateScenario,
  onSelectScenario,
}) {
  const [activeModal, setActiveModal] = useState(null)
  const [editingScenarioId, setEditingScenarioId] = useState(null)
  const selectedProjection = projections[state.selectedScenarioId]
  const selectedMeasures = state.measures.filter(
    (measure) => measure.scenarioId === state.selectedScenarioId,
  )
  const includedSiteCount = state.bauAssumptions.includedSiteIds.length
  const normalisedTarget = normaliseTargetSettings(state.targetSettings)
  const modeledScopeLabels = [
    ...new Set(
      normalisedTarget.scopeTargets
        .filter((target) => target.modeled !== false)
        .map((target) => target.scopeLabel),
    ),
  ].join(' + ')
  const hasScope3Placeholder = normalisedTarget.scopeTargets.some(
    (target) => target.scope === 'scope3' && target.modeled === false,
  )
  const totalBaselineMwh = projections.bau.siteYearRows
    .filter((row) => row.year === state.bauAssumptions.startYear)
    .reduce((sum, row) => sum + row.totalEnergyMWh, 0)

  const editingScenario = state.scenarios.find((scenario) => scenario.id === editingScenarioId)

  function openScenarioModal(scenarioId) {
    setEditingScenarioId(scenarioId)
    setActiveModal('scenario')
  }

  function closeModal() {
    setActiveModal(null)
    setEditingScenarioId(null)
  }

  return (
    <>
      <div className="space-y-5">
        <EmissionsTrajectoryChart data={trajectoryData} />
        <SummaryCards
          bauProjection={projections.bau}
          selectedProjection={selectedProjection}
          targetPathway={targetPathway}
          selectedMeasures={selectedMeasures}
          financeRows={selectedFinanceRows}
        />

        <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="grid content-start gap-4 lg:grid-cols-2 xl:grid-cols-1">
            <SetupCard
              icon={Settings}
              title="BAU assumptions"
              eyebrow="Scenario setup"
              onEdit={() => setActiveModal('bau')}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Planning period</p>
                  <p className="mt-1 font-semibold text-shi-blue">
                    {state.bauAssumptions.startYear}-{state.bauAssumptions.endYear}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Included sites</p>
                  <p className="mt-1 font-semibold text-shi-blue">{includedSiteCount}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Electricity growth</p>
                  <p className="mt-1 font-semibold text-shi-blue">
                    {formatPercent(state.bauAssumptions.electricityGrowthRate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Baseline energy</p>
                  <p className="mt-1 font-semibold text-shi-blue">{formatMwh(totalBaselineMwh)}</p>
                </div>
              </div>
            </SetupCard>
            <SetupCard
              icon={Target}
              title="Scope target set"
              eyebrow="Target pathway"
              onEdit={() => setActiveModal('target')}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Baseline</p>
                  <p className="mt-1 font-semibold text-shi-blue">
                    {normalisedTarget.baselineYear} |{' '}
                    {formatEmissions(normalisedTarget.baselineEmissionsTco2e)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Modelled scopes</p>
                  <p className="mt-1 font-semibold text-shi-blue">{modeledScopeLabels}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">2030 target</p>
                  <p className="mt-1 font-semibold text-shi-blue">
                    {formatEmissions(normalisedTarget.targetEmissionsTco2e)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">2050 target</p>
                  <p className="mt-1 font-semibold text-shi-blue">
                    {formatEmissions(normalisedTarget.longTermTargetEmissionsTco2e)}
                  </p>
                </div>
              </div>
              {hasScope3Placeholder ? (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Scope 3 target rows are visible as placeholders and are excluded from the current
                  Scope 1 + Scope 2 emissions engine.
                </p>
              ) : null}
            </SetupCard>
          </div>

          <section className="panel">
            <div className="section-heading">
              <p>Scenario definition</p>
              <span>Open each card to edit its details</span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3 xl:grid-cols-1">
              {state.scenarios.map((scenario) => {
                const measures = state.measures.filter(
                  (measure) => measure.scenarioId === scenario.id,
                )
                return (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    projection={projections[scenario.id]}
                    measures={measures}
                    financeRows={financeRowsByScenario[scenario.id] ?? []}
                    isSelected={state.selectedScenarioId === scenario.id}
                    onSelect={() => onSelectScenario(scenario.id)}
                    onEdit={() => openScenarioModal(scenario.id)}
                  />
                )
              })}
            </div>
          </section>
        </section>

        <EnergyCostChart data={costData} />
      </div>

      {activeModal === 'bau' ? (
        <ModalShell
          title="Edit BAU Assumptions"
          subtitle="Update the baseline growth, price, grid and site inclusion settings."
          size="lg"
          onClose={closeModal}
        >
          <BauSettingsPanel
            assumptions={state.bauAssumptions}
            sites={state.sites}
            onUpdate={onUpdateBau}
            surface="modal"
          />
        </ModalShell>
      ) : null}

      {activeModal === 'target' ? (
        <ModalShell
          title="Edit Target Pathway"
          subtitle="Update 2030 and 2050 target records by SBTi scope."
          size="xl"
          onClose={closeModal}
        >
          <TargetSettingsPanel
            targetSettings={state.targetSettings}
            onUpdate={onUpdateTarget}
            surface="modal"
          />
        </ModalShell>
      ) : null}

      {activeModal === 'scenario' && editingScenario ? (
        <ModalShell
          title={`Edit ${editingScenario.name}`}
          subtitle="Define scenario ownership, investment profile, notes and portfolio context."
          size="xl"
          onClose={closeModal}
        >
          <ScenarioDetailsModal
            scenario={editingScenario}
            measures={state.measures.filter((measure) => measure.scenarioId === editingScenario.id)}
            financeRows={financeRowsByScenario[editingScenario.id] ?? []}
            projection={projections[editingScenario.id]}
            onSave={(scenario) => {
              onUpdateScenario(scenario)
              closeModal()
            }}
            onCancel={closeModal}
          />
        </ModalShell>
      ) : null}
    </>
  )
}

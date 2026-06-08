import { ArrowRight, Copy, Pencil, Trash2 } from 'lucide-react'
import { formatCompactCurrency, formatCurrency, formatEmissions, formatPayback } from '../lib/formatters'
import {
  canAdvanceMeasure,
  getMeasureProgress,
  getMeasureStatusLabel,
  getNextWorkflowAction,
  getResponsiblePerson,
} from '../lib/measureWorkflow'

export default function MeasurePortfolioTable({
  measures,
  sites,
  scenarios,
  financeRows,
  people,
  onEdit,
  onDuplicate,
  onDelete,
  onAdvanceWorkflow,
}) {
  const siteById = new Map(sites.map((site) => [site.id, site]))
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
  const financeByMeasure = new Map(financeRows.map((row) => [row.id, row]))

  return (
    <section className="panel overflow-hidden">
      <div className="section-heading">
        <p>Measure portfolio</p>
        <span>{measures.length} measures across validation and delivery stages</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="data-table min-w-[1600px]">
          <thead>
            <tr>
              <th>Measure</th>
              <th>Scenario</th>
              <th>Site</th>
              <th>Category</th>
              <th>Indicator</th>
              <th>Start</th>
              <th>Capex</th>
              <th>Annual opex</th>
              <th>Annual saving</th>
              <th>tCO2e reduction</th>
              <th>Payback</th>
              <th>Status</th>
              <th>Responsible</th>
              <th>Progress</th>
              <th>Next action</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {measures.map((measure) => {
              const finance = financeByMeasure.get(measure.id)
              const progress = getMeasureProgress(measure)
              const workflowAction = getNextWorkflowAction(measure)
              return (
                <tr key={measure.id}>
                  <td>
                    <span className="font-semibold text-shi-blue">{measure.name}</span>
                    <span className="block text-xs text-slate-500">{measure.owner}</span>
                  </td>
                  <td>{scenarioById.get(measure.scenarioId)?.name}</td>
                  <td>{siteById.get(measure.siteId)?.name}</td>
                  <td>{measure.category}</td>
                  <td>{measure.targetEnergyIndicator}</td>
                  <td>{measure.startYear}</td>
                  <td>{formatCompactCurrency(measure.capexUsd)}</td>
                  <td>{formatCurrency(measure.annualOpexChangeUsd)}</td>
                  <td>{formatCurrency(finance?.annualAvoidedEnergyCostUsd ?? 0)}</td>
                  <td>{formatEmissions(finance?.annualEmissionsReductionTco2e ?? 0, 1)}</td>
                  <td>{formatPayback(finance?.simplePaybackYears)}</td>
                  <td>
                    <span className="status-badge">{getMeasureStatusLabel(measure.status)}</span>
                  </td>
                  <td>
                    <span className="font-semibold text-shi-blue">
                      {getResponsiblePerson(measure, people)}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {measure.validationStage ?? 'Not submitted'}
                    </span>
                  </td>
                  <td>
                    <div className="min-w-32">
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-shi-accent"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </td>
                  <td className="max-w-[13rem] text-xs text-slate-600">
                    {measure.nextAction ?? 'Prepare validation pack'}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {canAdvanceMeasure(measure) ? (
                        <button
                          type="button"
                          className="icon-button"
                          title={workflowAction.actionLabel}
                          onClick={() => onAdvanceWorkflow(measure.id)}
                        >
                          <ArrowRight size={15} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="icon-button"
                        title="Edit measure"
                        onClick={() => onEdit(measure.id)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Duplicate measure"
                        onClick={() => onDuplicate(measure.id)}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button text-red-700"
                        title="Delete measure"
                        onClick={() => onDelete(measure.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

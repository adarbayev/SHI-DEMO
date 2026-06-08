import { ArrowRight, Copy, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { formatCompactCurrency, formatEmissions } from '../lib/formatters'
import {
  canAdvanceMeasure,
  getNextWorkflowAction,
  groupMeasuresByStatus,
  measureWorkflowColumns,
} from '../lib/measureWorkflow'

const columnTone = {
  draft: 'border-slate-200 bg-slate-50/75',
  proposed: 'border-shi-accent/25 bg-blue-50/70',
  validation_requested: 'border-shi-orange/30 bg-orange-50/70',
  validated: 'border-shi-teal/30 bg-teal-50/70',
  in_progress: 'border-shi-lime/45 bg-lime-50/75',
  completed: 'border-emerald-300 bg-emerald-50/75',
}

function stopClick(event) {
  event.stopPropagation()
}

export default function MeasureKanbanBoard({
  measures,
  sites,
  scenarios,
  financeRows,
  onEdit,
  onDuplicate,
  onDelete,
  onAdvanceWorkflow,
}) {
  const siteById = new Map(sites.map((site) => [site.id, site]))
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
  const financeByMeasure = new Map(financeRows.map((row) => [row.id, row]))
  const groups = groupMeasuresByStatus(measures)

  return (
    <section className="panel overflow-hidden">
      <div className="section-heading">
        <p>Measure workflow board</p>
        <span>{measures.length} measures across validation and delivery</span>
      </div>
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="grid min-w-[1120px] grid-cols-6 gap-3">
          {measureWorkflowColumns.map((column) => {
            const columnMeasures = groups.get(column.value) ?? []
            return (
              <section key={column.value} className="min-w-0">
                <div
                  className={clsx(
                    'mb-2 flex min-h-[58px] items-center justify-between gap-2 rounded-md border px-3 py-2 shadow-sm',
                    columnTone[column.value],
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase text-shi-blue">
                      {column.shortLabel}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      {columnMeasures.length} measures
                    </p>
                  </div>
                  <span className="rounded-md border border-white/80 bg-white/80 px-2 py-1 text-xs font-semibold text-shi-blue">
                    {columnMeasures.length}
                  </span>
                </div>
                <div
                  className={clsx(
                    'min-h-[520px] space-y-2 rounded-md border p-2',
                    columnTone[column.value],
                  )}
                >
                  {columnMeasures.length ? (
                    columnMeasures.map((measure) => {
                      const site = siteById.get(measure.siteId)
                      const scenario = scenarioById.get(measure.scenarioId)
                      const finance = financeByMeasure.get(measure.id)
                      const workflowAction = getNextWorkflowAction(measure)
                      return (
                        <article
                          key={measure.id}
                          className="cursor-pointer rounded-md border border-white/80 bg-white/95 p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-shi-accent/40 hover:shadow-soft"
                          onClick={() => onEdit(measure.id)}
                        >
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-shi-blue">
                              {measure.name}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500">
                              {site?.siteShortName ?? site?.name} | {scenario?.name}
                            </p>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
                            <span className="rounded-md bg-slate-50 px-2 py-1.5">
                              <b className="block text-shi-blue">{measure.startYear}</b>
                              <span className="text-slate-500">Start</span>
                            </span>
                            <span className="rounded-md bg-slate-50 px-2 py-1.5">
                              <b className="block text-shi-blue">
                                {formatCompactCurrency(measure.capexUsd)}
                              </b>
                              <span className="text-slate-500">Capex</span>
                            </span>
                            <span className="rounded-md bg-slate-50 px-2 py-1.5">
                              <b className="block truncate text-shi-blue">
                                {formatEmissions(finance?.annualEmissionsReductionTco2e ?? 0, 1)}
                              </b>
                              <span className="text-slate-500">Reduction</span>
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5" onClick={stopClick}>
                            {canAdvanceMeasure(measure) ? (
                              <button
                                type="button"
                                className="icon-button"
                                title={workflowAction.actionLabel}
                                onClick={() => onAdvanceWorkflow(measure.id)}
                              >
                                <ArrowRight size={14} />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="icon-button"
                              title="Edit measure"
                              onClick={() => onEdit(measure.id)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title="Duplicate measure"
                              onClick={() => onDuplicate(measure.id)}
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-button text-red-700"
                              title="Delete measure"
                              onClick={() => onDelete(measure.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </article>
                      )
                    })
                  ) : (
                    <div className="rounded-md border border-dashed border-slate-200 bg-white/60 p-3 text-xs text-slate-500">
                      No measures in this stage.
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}

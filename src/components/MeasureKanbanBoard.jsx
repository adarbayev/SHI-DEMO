import { ArrowRight, CalendarDays, Copy, Pencil, Trash2, UserRound } from 'lucide-react'
import clsx from 'clsx'
import { formatCompactCurrency, formatCurrency, formatEmissions } from '../lib/formatters'
import {
  canAdvanceMeasure,
  getMeasureProgress,
  getMeasureStatusLabel,
  getNextWorkflowAction,
  getResponsiblePerson,
  groupMeasuresByStatus,
  measureWorkflowColumns,
} from '../lib/measureWorkflow'

const columnTone = {
  draft: 'border-slate-200 bg-slate-50/70',
  proposed: 'border-shi-accent/20 bg-blue-50/60',
  validation_requested: 'border-shi-orange/25 bg-orange-50/60',
  validated: 'border-shi-teal/25 bg-teal-50/60',
  in_progress: 'border-shi-lime/40 bg-lime-50/60',
  completed: 'border-emerald-300 bg-emerald-50/70',
}

function stopClick(event) {
  event.stopPropagation()
}

export default function MeasureKanbanBoard({
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
  const groups = groupMeasuresByStatus(measures)

  return (
    <section className="panel overflow-hidden">
      <div className="section-heading">
        <p>Measure workflow board</p>
        <span>{measures.length} measures across validation and delivery</span>
      </div>
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="grid min-w-[1220px] grid-cols-6 gap-3">
          {measureWorkflowColumns.map((column) => {
            const columnMeasures = groups.get(column.value) ?? []
            return (
              <section
                key={column.value}
                className={clsx('rounded-md border p-3', columnTone[column.value])}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-shi-blue">
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
                <div className="space-y-3">
                  {columnMeasures.length ? (
                    columnMeasures.map((measure) => {
                      const site = siteById.get(measure.siteId)
                      const scenario = scenarioById.get(measure.scenarioId)
                      const finance = financeByMeasure.get(measure.id)
                      const progress = getMeasureProgress(measure)
                      const workflowAction = getNextWorkflowAction(measure)
                      return (
                        <article
                          key={measure.id}
                          className="cursor-pointer rounded-md border border-white/80 bg-white/95 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-shi-accent/40 hover:shadow-soft"
                          onClick={() => onEdit(measure.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold leading-snug text-shi-blue">
                                {measure.name}
                              </h3>
                              <p className="mt-1 text-xs leading-snug text-slate-500">
                                {site?.siteShortName ?? site?.name} | {scenario?.name}
                              </p>
                            </div>
                            <span className="status-badge shrink-0">
                              {getMeasureStatusLabel(measure.status)}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
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
                              <b className="block text-shi-blue">
                                {formatCurrency(finance?.annualAvoidedEnergyCostUsd ?? 0)}
                              </b>
                              <span className="text-slate-500">Annual saving</span>
                            </span>
                            <span className="rounded-md bg-slate-50 px-2 py-1.5">
                              <b className="block text-shi-blue">
                                {formatEmissions(finance?.annualEmissionsReductionTco2e ?? 0, 1)}
                              </b>
                              <span className="text-slate-500">Reduction</span>
                            </span>
                          </div>

                          <div className="mt-3 space-y-2 text-xs text-slate-600">
                            <p className="flex items-center gap-1.5">
                              <UserRound size={13} />
                              <span className="font-semibold text-shi-blue">
                                {getResponsiblePerson(measure, people)}
                              </span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <CalendarDays size={13} />
                              <span>{measure.dueDate ?? 'No due date'}</span>
                            </p>
                            <p className="line-clamp-2 leading-snug">
                              {measure.nextAction ?? 'Prepare validation pack'}
                            </p>
                          </div>

                          <div className="mt-3">
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

                          <div className="mt-3 flex flex-wrap gap-1.5" onClick={stopClick}>
                            {canAdvanceMeasure(measure) ? (
                              <button
                                type="button"
                                className="btn-secondary min-h-8 px-2 py-1 text-xs"
                                onClick={() => onAdvanceWorkflow(measure.id)}
                              >
                                <ArrowRight size={13} />
                                {workflowAction.actionLabel}
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

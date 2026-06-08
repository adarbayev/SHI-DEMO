import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Plus, Save, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import clsx from 'clsx'
import { energyIndicators, measureCategories, scopeOptions } from '../data/seedMeasures'
import { formatCurrency, formatEmissions, parseNumber } from '../lib/formatters'
import {
  advanceMeasureWorkflow,
  getMeasureProgress,
  getMeasureStatusLabel,
  getNextWorkflowAction,
  getResponsiblePerson,
  getValidatorPerson,
  measureStatusOptions,
  normaliseMeasureStatus,
} from '../lib/measureWorkflow'
import { Field, InfoTooltip, NumberInput, SelectInput, TextInput } from './Field'

function createBlankMeasure(defaultScenarioId, defaultSiteId) {
  return {
    name: '',
    scenarioId: defaultScenarioId,
    siteId: defaultSiteId,
    category: 'HVAC optimisation',
    targetScope: 'scope2_location_based',
    targetEnergyIndicator: 'electricityMWh',
    startYear: 2027,
    phaseInYears: 1,
    usefulLifeYears: 10,
    capexUsd: 100000,
    annualOpexChangeUsd: 0,
    reductionType: 'percentage',
    reductionValue: 0.05,
    internalCarbonPriceEligible: true,
    owner: 'Facilities',
    responsiblePersonId: 'person-facilities-lead',
    validatorPersonId: 'person-sustainability-validator',
    responsiblePerson: 'Facilities lead',
    status: 'draft',
    validationStage: 'Not submitted',
    dueDate: '2027-06-30',
    progressPercent: 0,
    nextAction: 'Prepare validation pack',
    notes: '',
  }
}

function categoryDefaults(category) {
  const defaults = {
    'HVAC optimisation': ['scope2_location_based', 'electricityMWh'],
    'BMS schedule tuning': ['scope2_location_based', 'electricityMWh'],
    'Insulation upgrade': ['scope1_scope2', 'naturalGasMWh'],
    'Chiller or VFD upgrade': ['scope2_location_based', 'electricityMWh'],
    'Lighting upgrade': ['scope2_location_based', 'electricityMWh'],
    'Solar PV installation': ['scope2_location_based', 'purchasedElectricityMWh'],
    'Transport electrification': ['scope1_scope2', 'petrolMWh'],
    'Gas-to-electric heating': ['scope1_scope2', 'naturalGasMWh'],
    'Data-centre cooling improvement': ['scope2_location_based', 'electricityMWh'],
    'Custom measure': ['scope2_location_based', 'electricityMWh'],
  }
  return defaults[category] ?? defaults['Custom measure']
}

function personOptionLabel(person) {
  return `${person.name} | ${person.role}`
}

export default function MeasureForm({
  sites,
  scenarios,
  people = [],
  selectedScenarioId,
  editingMeasure,
  finance,
  onSubmit,
  onAdvanceWorkflow,
  onCancel,
  onDelete,
  surface = 'panel',
  showHeading = true,
}) {
  const scenarioOptions = useMemo(
    () => scenarios.filter((scenario) => scenario.id !== 'bau'),
    [scenarios],
  )
  const [form, setForm] = useState(() =>
    editingMeasure
      ? { ...editingMeasure, status: normaliseMeasureStatus(editingMeasure.status) }
      : createBlankMeasure(selectedScenarioId, sites[0]?.id),
  )

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateCategory(category) {
    const [targetScope, targetEnergyIndicator] = categoryDefaults(category)
    setForm((current) => ({
      ...current,
      category,
      targetScope,
      targetEnergyIndicator,
      reductionType: category === 'Solar PV installation' ? 'absolute' : current.reductionType,
    }))
  }

  function advanceWorkflow() {
    if (!form.id || !onAdvanceWorkflow) return
    setForm((current) => advanceMeasureWorkflow(current, people))
    onAdvanceWorkflow(form.id)
  }

  function submit(event) {
    event.preventDefault()
    const responsiblePerson = people.find((person) => person.id === form.responsiblePersonId)
    const validatorPerson = people.find((person) => person.id === form.validatorPersonId)
    const payload = {
      ...form,
      id: form.id,
      name: form.name.trim() || `${form.category} measure`,
      status: normaliseMeasureStatus(form.status),
      startYear: parseNumber(form.startYear, 2027),
      phaseInYears: Math.max(1, parseNumber(form.phaseInYears, 1)),
      usefulLifeYears: Math.max(1, parseNumber(form.usefulLifeYears, 10)),
      capexUsd: parseNumber(form.capexUsd, 0),
      annualOpexChangeUsd: parseNumber(form.annualOpexChangeUsd, 0),
      progressPercent: Math.max(0, Math.min(100, parseNumber(form.progressPercent, 0))),
      responsiblePerson: responsiblePerson?.name || form.responsiblePerson?.trim() || form.owner?.trim() || 'Unassigned',
      validatorPerson: validatorPerson?.name || form.validatorPerson?.trim() || 'Not assigned',
      validationStage: form.validationStage?.trim() || 'Not submitted',
      dueDate: form.dueDate || '',
      nextAction: form.nextAction?.trim() || 'Prepare validation pack',
      reductionValue:
        form.reductionType === 'percentage'
          ? parseNumber(form.reductionValue, 0) > 1
            ? parseNumber(form.reductionValue, 0) / 100
            : parseNumber(form.reductionValue, 0)
          : parseNumber(form.reductionValue, 0),
      selfConsumptionPercentage:
        form.category === 'Solar PV installation' ? form.selfConsumptionPercentage ?? 0.85 : undefined,
      electrificationEfficiencyRatio:
        form.category === 'Transport electrification' || form.category === 'Gas-to-electric heating'
          ? form.electrificationEfficiencyRatio ?? 3
          : undefined,
    }
    onSubmit(payload)
    if (!editingMeasure) setForm(createBlankMeasure(selectedScenarioId, sites[0]?.id))
  }

  const displayedReductionValue =
    form.reductionType === 'percentage'
      ? Number.isFinite(form.reductionValue)
        ? form.reductionValue > 1
          ? form.reductionValue
          : form.reductionValue * 100
        : ''
      : form.reductionValue
  const workflowAction = form.id ? getNextWorkflowAction(form) : null
  const progress = getMeasureProgress(form)

  return (
    <form className={clsx(surface === 'panel' && 'panel')} onSubmit={submit}>
      {showHeading ? (
        <div className="section-heading">
          <p>{editingMeasure ? 'Edit measure' : 'Add measure'}</p>
          <span>Energy indicator specific</span>
        </div>
      ) : null}
      <div className="mt-4 grid gap-4">
        <section className="rounded-md border border-shi-accent/20 bg-gradient-to-br from-white to-blue-50/60 p-4">
          <div className="section-heading border-blue-100">
            <div>
              <p>Validation workflow</p>
              <span>{getMeasureStatusLabel(form.status)}</span>
            </div>
            {workflowAction ? (
              <button type="button" className="btn-primary" onClick={advanceWorkflow}>
                <ArrowRight size={16} />
                {workflowAction.actionLabel}
              </button>
            ) : (
              <span className="status-badge">No next workflow action</span>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-white/80 bg-white/85 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
              <p className="mt-2 text-lg font-semibold text-shi-blue">{getMeasureStatusLabel(form.status)}</p>
            </div>
            <div className="rounded-md border border-white/80 bg-white/85 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Responsible</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-shi-blue">
                <UserRound size={15} />
                {getResponsiblePerson(form, people)}
              </p>
            </div>
            <div className="rounded-md border border-white/80 bg-white/85 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Validator</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-shi-blue">
                <ShieldCheck size={15} />
                {getValidatorPerson(form, people)}
              </p>
            </div>
            <div className="rounded-md border border-white/80 bg-white/85 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Due date</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-shi-blue">
                <CalendarDays size={15} />
                {form.dueDate || 'Not set'}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 rounded-full bg-white">
              <div className="h-2 rounded-full bg-shi-accent" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-xs font-semibold text-slate-500">
              <span>{Math.round(progress)}% progress</span>
              <span>{form.nextAction || 'Prepare validation pack'}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="Workflow status" tooltip="Collaboration status. This does not change projection or MACC calculations.">
              <SelectInput value={form.status} onChange={(value) => update('status', value)}>
                {measureStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Responsible person" tooltip="Person who owns delivery after validation.">
              <SelectInput
                value={form.responsiblePersonId ?? ''}
                onChange={(value) => update('responsiblePersonId', value)}
              >
                <option value="">Unassigned</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {personOptionLabel(person)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Validator" tooltip="Sustainability or finance reviewer for the validation workflow.">
              <SelectInput
                value={form.validatorPersonId ?? ''}
                onChange={(value) => update('validatorPersonId', value)}
              >
                <option value="">Unassigned</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {personOptionLabel(person)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Due date" tooltip="Planning due date for the next validation or delivery action.">
              <input
                className="input"
                type="date"
                value={form.dueDate ?? ''}
                onChange={(event) => update('dueDate', event.target.value)}
              />
            </Field>
            <Field label="Progress %" tooltip="Delivery progress after validation and assignment.">
              <NumberInput
                value={form.progressPercent ?? 0}
                min={0}
                max={100}
                step={5}
                onChange={(value) => update('progressPercent', value)}
              />
            </Field>
            <Field label="Validation stage" tooltip="Current validation or hand-off note shown in the measure portfolio.">
              <TextInput
                value={form.validationStage ?? ''}
                onChange={(value) => update('validationStage', value)}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Next action" tooltip="Next owner action used to track delivery after validation.">
              <TextInput value={form.nextAction ?? ''} onChange={(value) => update('nextAction', value)} />
            </Field>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="surface-card rounded-md p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Annual saving</p>
            <p className="mt-2 text-xl font-semibold text-shi-blue">
              {formatCurrency(finance?.annualAvoidedEnergyCostUsd ?? 0)}
            </p>
          </div>
          <div className="surface-card rounded-md p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Annual reduction</p>
            <p className="mt-2 text-xl font-semibold text-shi-blue">
              {formatEmissions(finance?.annualEmissionsReductionTco2e ?? 0, 1)}
            </p>
          </div>
          <div className="surface-card rounded-md p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Payback</p>
            <p className="mt-2 text-xl font-semibold text-shi-blue">
              {Number.isFinite(finance?.simplePaybackYears)
                ? `${finance.simplePaybackYears.toFixed(1)} years`
                : 'Not paid back'}
            </p>
          </div>
        </div>

        <Field label="Measure name">
          <TextInput value={form.name} onChange={(value) => update('name', value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Scenario"
            tooltip="Portfolio scenario this measure belongs to. BAU is the reference case and cannot receive measures."
          >
            <SelectInput value={form.scenarioId} onChange={(value) => update('scenarioId', value)}>
              {scenarioOptions.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field
            label="Site"
            tooltip="Site whose baseline energy, cost, and emissions are affected by this measure."
          >
            <SelectInput value={form.siteId} onChange={(value) => update('siteId', value)}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field
          label="Category"
          tooltip="Measure type. Changing it sets sensible default scope and indicator values."
        >
          <SelectInput value={form.category} onChange={updateCategory}>
            {measureCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Target scope" tooltip="Reporting scope used for this measure's impact.">
            <SelectInput value={form.targetScope} onChange={(value) => update('targetScope', value)}>
              {scopeOptions.map((scope) => (
                <option key={scope.id} value={scope.id}>
                  {scope.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Indicator" tooltip="Energy or emissions driver reduced by the measure.">
            <SelectInput
              value={form.targetEnergyIndicator}
              onChange={(value) => update('targetEnergyIndicator', value)}
            >
              {energyIndicators.map((indicator) => (
                <option key={indicator} value={indicator}>
                  {indicator}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Start" tooltip="First year when the measure begins and phase-in starts.">
            <NumberInput value={form.startYear} min={2026} max={2050} onChange={(value) => update('startYear', value)} />
          </Field>
          <Field label="Phase-in" tooltip="Number of years until the measure reaches full annual impact.">
            <NumberInput value={form.phaseInYears} min={1} max={10} onChange={(value) => update('phaseInYears', value)} />
          </Field>
          <Field
            label="Life"
            tooltip="Useful life in years. After this period the measure stops contributing to projections."
          >
            <NumberInput value={form.usefulLifeYears} min={1} max={30} onChange={(value) => update('usefulLifeYears', value)} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Capex USD" tooltip="One-time investment assumed for the measure.">
            <NumberInput value={form.capexUsd} min={0} step={5000} onChange={(value) => update('capexUsd', value)} />
          </Field>
          <Field
            label="Annual opex"
            tooltip="Recurring annual operating cost change. Negative values mean operating savings."
          >
            <NumberInput
              value={form.annualOpexChangeUsd}
              step={1000}
              onChange={(value) => update('annualOpexChangeUsd', value)}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Reduction type"
            tooltip="Percentage reduces the selected indicator by a fraction. Absolute MWh reduces it by a fixed amount."
          >
            <SelectInput value={form.reductionType} onChange={(value) => update('reductionType', value)}>
              <option value="percentage">Percentage</option>
              <option value="absolute">Absolute MWh</option>
            </SelectInput>
          </Field>
          <Field
            label={form.reductionType === 'percentage' ? 'Reduction %' : 'Reduction MWh'}
            tooltip="Full-impact annual reduction after phase-in. Enter 5 for 5%."
          >
            <NumberInput
              value={displayedReductionValue}
              min={0}
              step={form.reductionType === 'percentage' ? 0.1 : 10}
              onChange={(value) => update('reductionValue', value)}
            />
          </Field>
        </div>
        <Field
          label="Owner"
          tooltip="Internal team accountable for the measure record and its validation pack."
        >
          <TextInput value={form.owner} onChange={(value) => update('owner', value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-shi-blue">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-shi-accent"
            checked={form.internalCarbonPriceEligible}
            onChange={(event) => update('internalCarbonPriceEligible', event.target.checked)}
          />
          <span className="inline-flex items-center gap-1.5">
            Eligible for internal carbon price
            <InfoTooltip text="Include this measure's emissions reduction in carbon price value and adjusted MAC." />
          </span>
        </label>
        <Field label="Notes">
          <textarea
            className="input min-h-20 resize-y"
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          {editingMeasure && onDelete ? (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-50"
              onClick={() => onDelete(editingMeasure.id)}
            >
              <Trash2 size={16} />
              Delete
            </button>
          ) : null}
          <div className="flex-1" />
          <button type="submit" className="btn-primary">
            {editingMeasure ? <Save size={16} /> : <Plus size={16} />}
            {editingMeasure ? 'Save measure' : 'Add measure'}
          </button>
          {editingMeasure ? (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              <X size={16} />
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </form>
  )
}

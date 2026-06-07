import { useState } from 'react'
import { Save } from 'lucide-react'
import { Field, SelectInput, TextInput } from './Field'
import {
  formatCompactCurrency,
  formatCurrency,
  formatEmissions,
  formatNumber,
} from '../lib/formatters'
import { getMeasureStatusLabel } from '../lib/measureWorkflow'
import MetricCard from './MetricCard'

export default function ScenarioDetailsModal({
  scenario,
  measures,
  financeRows,
  projection,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState(() => ({
    name: scenario.name ?? '',
    description: scenario.description ?? '',
    owner: scenario.owner ?? '',
    status: scenario.status ?? 'working case',
    investmentProfile: scenario.investmentProfile ?? '',
    notes: scenario.notes ?? '',
  }))

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    onSave({
      ...scenario,
      ...form,
      name: form.name.trim() || scenario.name,
    })
  }

  const emissions2030 =
    projection?.yearly.find((point) => point.year === 2030)?.totalEmissionsTco2e ?? 0
  const emissions2050 =
    projection?.yearly.find((point) => point.year === 2050)?.totalEmissionsTco2e ?? 0
  const capex = measures.reduce((sum, measure) => sum + measure.capexUsd, 0)
  const avoidedCost = financeRows.reduce((sum, row) => sum + row.annualAvoidedEnergyCostUsd, 0)

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Measures" value={formatNumber(measures.length)} />
        <MetricCard label="2030 emissions" value={formatEmissions(emissions2030)} />
        <MetricCard label="2050 emissions" value={formatEmissions(emissions2050)} />
        <MetricCard label="Portfolio capex" value={formatCompactCurrency(capex)} />
      </div>

      <section className="rounded-md border border-slate-200 p-4">
        <div className="section-heading">
          <p>Scenario identity</p>
          <span>{scenario.type}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Scenario name">
            <TextInput value={form.name} onChange={(value) => update('name', value)} />
          </Field>
          <Field label="Investment profile" tooltip="Short funding posture shown on scenario cards.">
            <TextInput
              value={form.investmentProfile}
              onChange={(value) => update('investmentProfile', value)}
              placeholder="Low capex, capital programme..."
            />
          </Field>
          <Field label="Owner">
            <TextInput value={form.owner} onChange={(value) => update('owner', value)} />
          </Field>
          <Field label="Status" tooltip="Planning stage for this scenario.">
            <SelectInput value={form.status} onChange={(value) => update('status', value)}>
              <option value="baseline">Baseline</option>
              <option value="working case">Working case</option>
              <option value="investment case">Investment case</option>
              <option value="approved">Approved</option>
              <option value="paused">Paused</option>
            </SelectInput>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Description" tooltip="Summary shown on the scenario card.">
            <textarea
              className="input min-h-20 resize-y"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 p-4">
        <div className="section-heading">
          <p>Scenario portfolio</p>
          <span>Read-only impact summary</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricCard label="Avoided energy cost" value={formatCurrency(avoidedCost)} />
          <MetricCard
            label="Annual reduction"
            value={formatEmissions(
              financeRows.reduce((sum, row) => sum + row.annualEmissionsReductionTco2e, 0),
              1,
            )}
          />
          <MetricCard
            label="Carbon value"
            value={formatCurrency(
              financeRows.reduce((sum, row) => sum + row.carbonPriceValueUsd, 0),
            )}
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data-table min-w-[680px]">
            <thead>
              <tr>
                <th>Measure</th>
                <th>Category</th>
                <th>Start</th>
                <th>Status</th>
                <th>Capex</th>
              </tr>
            </thead>
            <tbody>
              {measures.length ? (
                measures.map((measure) => (
                  <tr key={measure.id}>
                    <td className="font-semibold text-shi-blue">{measure.name}</td>
                    <td>{measure.category}</td>
                    <td>{measure.startYear}</td>
                    <td>
                      <span className="status-badge">{getMeasureStatusLabel(measure.status)}</span>
                    </td>
                    <td>{formatCompactCurrency(measure.capexUsd)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-slate-500">
                    No decarbonisation measures are assigned to this scenario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 p-4">
        <Field label="Scenario notes" tooltip="Internal planning context for the scenario.">
          <textarea
            className="input min-h-24 resize-y"
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
          />
        </Field>
      </section>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          <Save size={16} />
          Save scenario
        </button>
      </div>
    </form>
  )
}

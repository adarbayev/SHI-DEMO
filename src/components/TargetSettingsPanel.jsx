import clsx from 'clsx'
import { calculateTargetEmissions, normaliseTargetSettings } from '../lib/targetEngine'
import { formatEmissions } from '../lib/formatters'
import { Field, InfoTooltip, NumberInput, SelectInput } from './Field'

function targetReductionFromEmissions(target) {
  const baseline = target.baselineEmissionsTco2e ?? 0
  if (baseline <= 0) return 0
  return Math.round((1 - (target.targetEmissionsTco2e ?? 0) / baseline) * 1000) / 10
}

function TargetNumberInput({ value, min = 0, max, step = 1, disabled = false, onChange }) {
  return (
    <NumberInput
      className={clsx('min-w-[7rem]', disabled && 'bg-slate-100 text-slate-500')}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={onChange}
    />
  )
}

function TargetPercentInput({ value, disabled = false, onChange }) {
  return (
    <div className="relative min-w-[6.5rem]">
      <NumberInput
        className={clsx('pr-8', disabled && 'bg-slate-100 text-slate-500')}
        value={value}
        min={0}
        max={100}
        step={0.1}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
        %
      </span>
    </div>
  )
}

function HeaderWithTooltip({ label, tooltip }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <InfoTooltip text={tooltip} />
    </span>
  )
}

function ScopeTargetTable({ title, subtitle, rows, onUpdateTarget }) {
  return (
    <div className="rounded-md border border-slate-200">
      <div className="border-b border-slate-200 px-3 py-3">
        <p className="text-sm font-semibold uppercase text-shi-blue">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[980px]">
          <thead>
            <tr>
              <th>Scope</th>
              <th>
                <HeaderWithTooltip
                  label="Status"
                  tooltip="Modelled rows are included in the current Scope 1 and Scope 2 pathway. Placeholder rows are visible but excluded."
                />
              </th>
              <th>Baseline year</th>
              <th>
                <HeaderWithTooltip
                  label="Baseline emissions"
                  tooltip="Scope-specific baseline tCO2e used to calculate the target line."
                />
              </th>
              <th>Target year</th>
              <th>
                <HeaderWithTooltip
                  label="Reduction"
                  tooltip="Percent reduction from the baseline to the target year."
                />
              </th>
              <th>
                <HeaderWithTooltip
                  label="Target emissions"
                  tooltip="Calculated or editable target-year emissions for that scope and horizon."
                />
              </th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((target) => {
              const disabled = target.modeled === false
              return (
                <tr key={target.id}>
                  <td>
                    <div className="font-semibold text-shi-blue">{target.scopeLabel}</div>
                    <div className="text-xs text-slate-500">{target.horizonLabel}</div>
                  </td>
                  <td>
                    <span
                      className={clsx(
                        'inline-flex rounded-md border px-2 py-1 text-xs font-semibold',
                        disabled
                          ? 'border-slate-200 bg-slate-50 text-slate-500'
                          : 'border-shi-accent/20 bg-shi-accent/10 text-shi-accent',
                      )}
                    >
                      {disabled ? 'Not modelled' : 'Modelled'}
                    </span>
                  </td>
                  <td>
                    <TargetNumberInput
                      value={target.baselineYear}
                      min={2020}
                      max={2025}
                      disabled={disabled}
                      onChange={(value) => onUpdateTarget(target.id, { baselineYear: value })}
                    />
                  </td>
                  <td>
                    <TargetNumberInput
                      value={target.baselineEmissionsTco2e}
                      min={0}
                      disabled={disabled}
                      onChange={(value) => {
                        const next = {
                          ...target,
                          baselineEmissionsTco2e: value,
                        }
                        onUpdateTarget(target.id, {
                          baselineEmissionsTco2e: value,
                          targetEmissionsTco2e: Math.round(calculateTargetEmissions(next)),
                        })
                      }}
                    />
                  </td>
                  <td>
                    <TargetNumberInput
                      value={target.targetYear}
                      min={2027}
                      max={2050}
                      disabled={disabled}
                      onChange={(value) => onUpdateTarget(target.id, { targetYear: value })}
                    />
                  </td>
                  <td>
                    <TargetPercentInput
                      value={target.reductionPercent}
                      disabled={disabled}
                      onChange={(value) => {
                        const next = {
                          ...target,
                          reductionPercent: value,
                        }
                        onUpdateTarget(target.id, {
                          reductionPercent: value,
                          targetEmissionsTco2e: Math.round(calculateTargetEmissions(next)),
                        })
                      }}
                    />
                  </td>
                  <td>
                    <TargetNumberInput
                      value={target.targetEmissionsTco2e}
                      min={0}
                      disabled={disabled}
                      onChange={(value) => {
                        const next = {
                          ...target,
                          targetEmissionsTco2e: value,
                        }
                        onUpdateTarget(target.id, {
                          targetEmissionsTco2e: value,
                          reductionPercent: targetReductionFromEmissions(next),
                        })
                      }}
                    />
                  </td>
                  <td className="max-w-[15rem] text-xs text-slate-500">{target.note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TargetSettingsPanel({ targetSettings, onUpdate, surface = 'panel' }) {
  const normalisedTarget = normaliseTargetSettings(targetSettings)
  const nearTermTargets = normalisedTarget.scopeTargets.filter(
    (target) => target.horizon === 'near_term',
  )
  const longTermTargets = normalisedTarget.scopeTargets.filter(
    (target) => target.horizon === 'long_term',
  )
  const modeledScopeLabels = [
    ...new Set(
      normalisedTarget.scopeTargets
        .filter((target) => target.modeled !== false)
        .map((target) => target.scopeLabel),
    ),
  ].join(' + ')

  function updateScopeTarget(targetId, patch) {
    const scopeTargets = normalisedTarget.scopeTargets.map((target) =>
      target.id === targetId ? { ...target, ...patch } : target,
    )
    onUpdate('scopeTargets', scopeTargets)
  }

  return (
    <section className={clsx(surface === 'panel' && 'panel')}>
      <div className="section-heading">
        <p>Target pathway</p>
        <span>SBTi-style scope target records</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(14rem,18rem),1fr]">
        <Field
          label="Target mode"
          tooltip="SBTi-style preset or editable custom scope target set."
        >
          <SelectInput value={normalisedTarget.mode} onChange={(value) => onUpdate('mode', value)}>
            <option value="sbti">SBTi-style preset</option>
            <option value="custom">Custom target</option>
          </SelectInput>
        </Field>
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-3">
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
      </div>

      <div className="mt-4 space-y-4">
        <ScopeTargetTable
          title="Mid-term targets"
          subtitle="2030 target records by SBTi scope."
          rows={nearTermTargets}
          onUpdateTarget={updateScopeTarget}
        />
        <ScopeTargetTable
          title="Long-term targets"
          subtitle="2050 target records by SBTi scope."
          rows={longTermTargets}
          onUpdateTarget={updateScopeTarget}
        />
      </div>
    </section>
  )
}

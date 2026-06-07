import { Field, NumberInput, PercentInput, SelectInput } from './Field'
import clsx from 'clsx'

export default function BauSettingsPanel({ assumptions, sites, onUpdate, surface = 'panel' }) {
  const included = new Set(assumptions.includedSiteIds)

  function toggleSite(siteId) {
    const next = new Set(included)
    if (next.has(siteId)) next.delete(siteId)
    else next.add(siteId)
    onUpdate('includedSiteIds', [...next])
  }

  return (
    <section className={clsx(surface === 'panel' && 'panel')}>
      <div className="section-heading">
        <p>BAU assumptions</p>
        <span>2025 to 2050</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Start year">
          <NumberInput
            value={assumptions.startYear}
            min={2025}
            max={2040}
            onChange={(value) => onUpdate('startYear', value)}
          />
        </Field>
        <Field label="End year">
          <NumberInput
            value={assumptions.endYear}
            min={2030}
            max={2050}
            onChange={(value) => onUpdate('endYear', value)}
          />
        </Field>
        <Field label="Electricity growth" tooltip="Annual linear demand growth, not compound growth.">
          <PercentInput
            value={assumptions.electricityGrowthRate}
            min={-5}
            max={15}
            onChange={(value) => onUpdate('electricityGrowthRate', value)}
          />
        </Field>
        <Field label="Fuel growth" tooltip="Annual linear demand growth, not compound growth.">
          <PercentInput
            value={assumptions.fuelGrowthRate}
            min={-5}
            max={15}
            onChange={(value) => onUpdate('fuelGrowthRate', value)}
          />
        </Field>
        <Field label="Price escalation" tooltip="Annual linear increase in energy unit costs.">
          <PercentInput
            value={assumptions.energyPriceEscalationRate}
            min={0}
            max={20}
            onChange={(value) => onUpdate('energyPriceEscalationRate', value)}
          />
        </Field>
        <Field
          label="Grid decline"
          tooltip="Annual linear reduction in the location-based electricity emissions factor."
        >
          <PercentInput
            value={assumptions.gridDecarbonisationRate}
            min={0}
            max={10}
            onChange={(value) => onUpdate('gridDecarbonisationRate', value)}
          />
        </Field>
        <Field
          label="Expansion factor"
          tooltip="Additional annual linear demand growth applied to included sites."
        >
          <PercentInput
            value={assumptions.siteExpansionGrowthRate}
            min={0}
            max={10}
            onChange={(value) => onUpdate('siteExpansionGrowthRate', value)}
          />
        </Field>
        <Field label="Emissions view" tooltip="Current MVP models location-based Scope 2 only.">
          <SelectInput
            value={assumptions.emissionsView}
            onChange={(value) => onUpdate('emissionsView', value)}
          >
            <option value="location_based">Location-based</option>
          </SelectInput>
        </Field>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase text-slate-500">Included sites</p>
        <div className="mt-2 space-y-2">
          {sites.map((site) => (
            <label key={site.id} className="flex items-start gap-2 text-sm text-shi-blue">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-shi-accent"
                checked={included.has(site.id)}
                onChange={() => toggleSite(site.id)}
              />
              <span>
                <span className="font-semibold">{site.name}</span>
                <span className="block text-xs text-slate-500">{site.region}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

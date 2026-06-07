import clsx from 'clsx'

export default function ScenarioSelector({ scenarios, selectedScenarioId, onSelect, includeBau = false }) {
  const visibleScenarios = includeBau
    ? scenarios
    : scenarios.filter((scenario) => scenario.id !== 'bau')

  return (
    <div className="flex flex-wrap gap-2">
      {visibleScenarios.map((scenario) => (
        <button
          key={scenario.id}
          type="button"
          className={clsx(
            'rounded-md border px-3 py-2 text-sm font-semibold',
            selectedScenarioId === scenario.id
              ? 'border-shi-accent bg-shi-accent text-white'
              : 'border-slate-200 bg-white text-shi-blue hover:border-shi-accent/50',
          )}
          onClick={() => onSelect(scenario.id)}
        >
          {scenario.name}
        </button>
      ))}
    </div>
  )
}

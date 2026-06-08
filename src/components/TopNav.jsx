import clsx from 'clsx'
import { RotateCcw } from 'lucide-react'
import ShiLogo from './ShiLogo'

const tabs = [
  { id: 'scenario', label: 'Scenario setup' },
  { id: 'operations', label: 'Operational dashboard' },
  { id: 'measures', label: 'Measure planner' },
  { id: 'finance', label: 'MACC and Finance' },
  { id: 'data', label: 'Data and assumptions' },
]

export default function TopNav({ activeTab, onTabChange, onReset }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 shadow-[0_14px_34px_rgba(37,55,70,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 lg:gap-4 lg:px-6 lg:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <ShiLogo className="h-11 w-[150px] shrink-0 sm:h-12 sm:w-[165px]" />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold text-shi-blue">Decarbonisation Sandbox</h1>
              </div>
              <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                Controlled baseline to BAU, measures, finance impact and target pathway.
              </p>
            </div>
          </div>
          <button type="button" className="btn-secondary w-fit" onClick={onReset}>
            <RotateCcw size={16} />
            Reset data
          </button>
        </div>
        <nav className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={clsx('tab-button', activeTab === tab.id && 'tab-button-active')}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}

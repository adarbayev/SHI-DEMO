import { useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '../lib/formatters'
import ChartFrame from './ChartFrame'

const series = [
  {
    key: 'bau',
    name: 'Business as usual (BAU)',
    stroke: '#EF4444',
  },
  {
    key: 'low_effort',
    name: 'Low effort',
    stroke: '#16A34A',
  },
  {
    key: 'high_investment',
    name: 'High investment',
    stroke: '#06B2B1',
  },
  {
    key: 'target',
    name: 'Target pathway',
    stroke: '#2563EB',
    strokeDasharray: '6 5',
  },
]

export default function EmissionsTrajectoryChart({ data }) {
  const [hiddenSeries, setHiddenSeries] = useState(() => new Set())

  function toggleSeries(dataKey) {
    setHiddenSeries((current) => {
      const next = new Set(current)
      if (next.has(dataKey)) next.delete(dataKey)
      else next.add(dataKey)
      return next
    })
  }

  return (
    <section className="panel min-h-[420px]">
      <div className="section-heading">
        <p>Operational emissions trajectory</p>
        <span>Scope 1 + Scope 2 location-based</span>
      </div>
      <ChartFrame className="mt-4 h-[340px]">
        {({ width, height }) => (
          <LineChart
            key={`${width}x${height}`}
            width={width}
            height={height}
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              width={72}
              domain={[0, 'dataMax + 1000']}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip
              formatter={(value) => [`${formatNumber(value, 0)} tCO2e`, '']}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Legend
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {(payload ?? []).map((entry) => {
                    const isHidden = hiddenSeries.has(entry.dataKey)
                    return (
                      <button
                        key={entry.dataKey}
                        type="button"
                        aria-pressed={!isHidden}
                        className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                          isHidden
                            ? 'border-slate-200 bg-white/50 text-slate-400'
                            : 'border-slate-200 bg-white/80 text-shi-blue hover:border-shi-accent'
                        }`}
                        onClick={() => toggleSeries(entry.dataKey)}
                      >
                        <span
                          className="h-2 w-5 rounded-full"
                          style={{
                            backgroundColor: entry.color,
                            opacity: isHidden ? 0.35 : 1,
                          }}
                        />
                        <span className={isHidden ? 'line-through' : ''}>{entry.value}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={item.stroke}
                strokeWidth={2}
                strokeDasharray={item.strokeDasharray}
                dot={false}
                hide={hiddenSeries.has(item.key)}
              />
            ))}
          </LineChart>
        )}
      </ChartFrame>
    </section>
  )
}

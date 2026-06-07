import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompactCurrency } from '../lib/formatters'
import ChartFrame from './ChartFrame'

export default function EnergyCostChart({ data }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <p>Energy cost trajectory</p>
        <span>Projected annual energy spend</span>
      </div>
      <ChartFrame className="mt-4 h-[260px]">
        {({ width, height }) => (
          <LineChart
            width={width}
            height={height}
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={72} tickFormatter={formatCompactCurrency} />
            <Tooltip formatter={(value) => [formatCompactCurrency(value), '']} />
            <Legend />
            <Line type="monotone" dataKey="bau" name="BAU" stroke="#253746" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="low_effort"
              name="Low effort"
              stroke="#1C64A5"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="high_investment"
              name="High investment"
              stroke="#06B2B1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )}
      </ChartFrame>
    </section>
  )
}

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartPoint } from '../types'
import { compact } from '../lib/forecast'

type Props = { data: ChartPoint[] }

export function ForecastChart({ data }: Props) {
  const peak = Math.max(
    1,
    ...data.map((point) => Math.max(point.actual ?? 0, point.forecast ?? 0)),
  )
  const yMax = Math.ceil(peak * 1.85)

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e2b657" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#e2b657" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(244,239,230,0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#b9b0a2', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: '#b9b0a2', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, yMax]}
          />
          <Tooltip
            contentStyle={{
              background: '#161310',
              border: '1px solid rgba(244,239,230,0.12)',
              borderRadius: 12,
              color: '#f4efe6',
            }}
            formatter={(value, name) => {
              if (value == null || name === 'band') return ['—', String(name)]
              return [compact(Number(value), 2), String(name)]
            }}
          />
          <Legend wrapperStyle={{ color: '#b9b0a2', fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="hi"
            name="Uncertainty"
            stroke="none"
            fill="url(#band)"
            legendType="square"
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Sold units"
            stroke="#f4efe6"
            strokeWidth={2.4}
            dot={{ r: 3, fill: '#f4efe6' }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="#e2b657"
            strokeWidth={2.6}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: '#e2b657' }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

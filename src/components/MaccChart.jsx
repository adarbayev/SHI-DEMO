import { useMemo, useState } from 'react'
import {
  formatCurrency,
  formatEmissions,
  formatNumber,
} from '../lib/formatters'
import { buildMaccCurveBlocks } from '../lib/maccEngine'
import ChartFrame from './ChartFrame'

const blockPalette = ['#253746', '#1C64A5', '#5D7896', '#8794AF', '#9CA3AF']
const negativeCostFill = '#4F9A82'

function makeLinearTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [0]
  return Array.from({ length: count }, (_, index) => {
    const step = (max - min) / (count - 1)
    return min + step * index
  })
}

function clampTooltip(value, max) {
  return Math.min(Math.max(value, 12), Math.max(12, max - 220))
}

function shortLabel(value) {
  if (value.length <= 22) return value
  return `${value.slice(0, 22)}...`
}

export default function MaccChart({ rows, view }) {
  const [hovered, setHovered] = useState(null)
  const blocks = useMemo(() => buildMaccCurveBlocks(rows, view), [rows, view])
  const totalAbatement = blocks.at(-1)?.x1 ?? 0

  const yValues = blocks.map((block) => block.macUsdPerTco2e)
  const minMac = Math.min(0, ...yValues)
  const maxMac = Math.max(0, ...yValues)
  const spread = Math.max(1, maxMac - minMac)
  const yMin = minMac < 0 ? minMac - spread * 0.12 : -spread * 0.08
  const yMax = maxMac > 0 ? maxMac + spread * 0.12 : spread * 0.08
  const yTicks = makeLinearTicks(yMin, yMax, 5)
  const xTicks = makeLinearTicks(0, totalAbatement, 5)

  return (
    <section className="panel">
      <div className="section-heading">
        <p>Marginal abatement cost curve</p>
        <span>
          {view === 'adjusted' ? 'Carbon-price adjusted' : 'Gross MAC'} | height = $/tCO2e, width =
          annual tCO2e
        </span>
      </div>
      <ChartFrame className="mt-4 h-[380px]">
        {({ width, height }) => {
          const margin = { top: 18, right: 18, bottom: 58, left: 78 }
          const innerWidth = Math.max(1, width - margin.left - margin.right)
          const innerHeight = Math.max(1, height - margin.top - margin.bottom)
          const yDomain = yMax - yMin || 1
          const xScale = (value) =>
            margin.left + (totalAbatement > 0 ? (value / totalAbatement) * innerWidth : 0)
          const yScale = (value) => margin.top + ((yMax - value) / yDomain) * innerHeight
          const zeroY = yScale(0)

          return (
            <div className="relative h-full w-full">
              <svg
                className="h-full w-full overflow-visible"
                role="img"
                aria-label="Marginal abatement cost curve"
                viewBox={`0 0 ${width} ${height}`}
              >
                <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />

                {yTicks.map((tick) => {
                  const y = yScale(tick)
                  return (
                    <g key={`y-${tick}`}>
                      <line
                        x1={margin.left}
                        x2={width - margin.right}
                        y1={y}
                        y2={y}
                        stroke={tick === 0 ? '#253746' : '#E2E8F0'}
                        strokeWidth={tick === 0 ? 1.5 : 1}
                      />
                      <text
                        x={margin.left - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-500 text-[11px]"
                      >
                        {formatCurrency(tick)}
                      </text>
                    </g>
                  )
                })}

                <line
                  x1={margin.left}
                  x2={margin.left}
                  y1={margin.top}
                  y2={height - margin.bottom}
                  stroke="#253746"
                  strokeWidth="1.2"
                />
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={height - margin.bottom}
                  y2={height - margin.bottom}
                  stroke="#CBD5E1"
                />

                {xTicks.map((tick) => {
                  const x = xScale(tick)
                  return (
                    <g key={`x-${tick}`}>
                      <line
                        x1={x}
                        x2={x}
                        y1={height - margin.bottom}
                        y2={height - margin.bottom + 5}
                        stroke="#94A3B8"
                      />
                      <text
                        x={x}
                        y={height - margin.bottom + 22}
                        textAnchor="middle"
                        className="fill-slate-500 text-[11px]"
                      >
                        {formatNumber(tick, 0)}
                      </text>
                    </g>
                  )
                })}

                {blocks.map((block) => {
                  const x = xScale(block.x0)
                  const blockWidth = Math.max(1, xScale(block.x1) - x)
                  const macY = yScale(block.macUsdPerTco2e)
                  const y = block.macUsdPerTco2e >= 0 ? macY : zeroY
                  const blockHeight = Math.max(1, Math.abs(zeroY - macY))
                  const fill =
                    block.macUsdPerTco2e < 0
                      ? negativeCostFill
                      : blockPalette[block.index % blockPalette.length]
                  const canShowLabel = blockWidth >= 72 && blockHeight >= 28

                  return (
                    <g key={block.id}>
                      <rect
                        x={x + 1}
                        y={y}
                        width={Math.max(1, blockWidth - 2)}
                        height={blockHeight}
                        fill={fill}
                        opacity="0.92"
                        stroke="#FFFFFF"
                        strokeWidth="1"
                        onMouseMove={(event) => {
                          const svgRect = event.currentTarget.ownerSVGElement.getBoundingClientRect()
                          setHovered({
                            block,
                            left: clampTooltip(event.clientX - svgRect.left + 14, width),
                            top: Math.max(10, event.clientY - svgRect.top - 18),
                          })
                        }}
                        onMouseLeave={() => setHovered(null)}
                      />
                      {canShowLabel ? (
                        <text
                          x={x + blockWidth / 2}
                          y={
                            block.macUsdPerTco2e >= 0
                              ? y + Math.min(18, blockHeight - 8)
                              : y + blockHeight - 10
                          }
                          textAnchor="middle"
                          className="pointer-events-none fill-white text-[10px] font-semibold"
                        >
                          {shortLabel(block.name)}
                        </text>
                      ) : null}
                    </g>
                  )
                })}

                <text
                  x={margin.left + innerWidth / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-slate-600 text-[12px] font-semibold"
                >
                  Annual abatement potential (tCO2e/yr)
                </text>
                <text
                  x="16"
                  y={margin.top + innerHeight / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 16 ${margin.top + innerHeight / 2})`}
                  className="fill-slate-600 text-[12px] font-semibold"
                >
                  MAC ($/tCO2e)
                </text>
              </svg>

              {hovered ? (
                <div
                  className="pointer-events-none absolute z-10 w-[220px] rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg"
                  style={{ left: hovered.left, top: hovered.top }}
                >
                  <p className="font-semibold text-shi-blue">{hovered.block.name}</p>
                  <div className="mt-2 grid gap-1 text-slate-600">
                    <p>MAC: {formatCurrency(hovered.block.macUsdPerTco2e, 1)} / tCO2e</p>
                    <p>Width: {formatEmissions(hovered.block.widthTco2e, 1)} / yr</p>
                    <p>Annual cost area: {formatCurrency(hovered.block.totalAnnualCostUsd, 0)}</p>
                  </div>
                </div>
              ) : null}

              {!blocks.length ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                  No active abatement measures with calculable MAC values.
                </div>
              ) : null}
            </div>
          )
        }}
      </ChartFrame>
    </section>
  )
}

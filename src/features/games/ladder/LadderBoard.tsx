import { motion } from 'motion/react'
import type { LadderEntry } from './api'

const COL_WIDTH = 46
const ROW_HEIGHT = 20
const TOP_PAD = 16
const REVEAL_DELAY = 1.7

function tracePath(rungs: boolean[][], start: number, columns: number): number[] {
  const path = [start]
  let pos = start
  for (const row of rungs) {
    if (pos > 0 && row[pos - 1]) pos -= 1
    else if (pos < columns - 1 && row[pos]) pos += 1
    path.push(pos)
  }
  return path
}

const PALETTE = ['#e8622c', '#d9a13c', '#c14e1a', '#8a6410', '#b5793a', '#a8624c', '#c97b52', '#9c7a2e']

export function LadderBoard({
  participants,
  results,
  rungs,
}: {
  participants: LadderEntry[]
  results: LadderEntry[]
  rungs: boolean[][]
}) {
  const columns = participants.length
  const rows = rungs.length
  const width = columns * COL_WIDTH
  const height = TOP_PAD * 2 + rows * ROW_HEIGHT

  const colX = (col: number) => (col + 0.5) * COL_WIDTH
  const rowY = (rowIdx: number) => TOP_PAD + rowIdx * ROW_HEIGHT

  const paths = participants.map((_, i) => tracePath(rungs, i, columns))

  return (
    <div className="ladder-board-wrap">
      <div className="ladder-labels top">
        {participants.map((p) => (
          <span key={p.id} className="ladder-label">
            {p.label}
          </span>
        ))}
      </div>
      <svg className="ladder-svg" viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        {Array.from({ length: columns }, (_, c) => (
          <line
            key={`col-${c}`}
            x1={colX(c)}
            y1={rowY(0)}
            x2={colX(c)}
            y2={rowY(rows)}
            stroke="var(--border-bright)"
            strokeWidth={2}
          />
        ))}
        {rungs.map((row, r) =>
          row.map(
            (has, c) =>
              has && (
                <line
                  key={`rung-${r}-${c}`}
                  x1={colX(c)}
                  y1={rowY(r + 1)}
                  x2={colX(c + 1)}
                  y2={rowY(r + 1)}
                  stroke="var(--accent-2)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              ),
          ),
        )}
        {paths.map((path, i) => (
          <motion.circle
            key={`token-${participants[i].id}`}
            r={5.5}
            fill={PALETTE[i % PALETTE.length]}
            initial={{ cx: colX(path[0]), cy: rowY(0) }}
            animate={{ cx: path.map((c) => colX(c)), cy: path.map((_, idx) => rowY(idx)) }}
            transition={{ duration: REVEAL_DELAY, ease: 'linear' }}
          />
        ))}
      </svg>
      <motion.div
        className="ladder-labels bottom"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: REVEAL_DELAY }}
      >
        {paths.map((path, i) => {
          const finalCol = path[path.length - 1]
          return (
            <span key={participants[i].id} className="ladder-label result">
              {results[finalCol]?.label ?? '?'}
            </span>
          )
        })}
      </motion.div>
    </div>
  )
}

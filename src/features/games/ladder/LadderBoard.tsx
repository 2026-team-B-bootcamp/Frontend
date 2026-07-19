/**
 * 사다리타기 게임의 보드(SVG) 컴포넌트.
 * LadderPanel이 서버에서 받아온 참가자/결과/가로줄(rungs) 데이터를 그대로 넘겨주면,
 * 이 컴포넌트는 순수하게 사다리 선을 그리고 각 참가자 토큰이 경로를 따라 이동하는
 * 애니메이션만 담당한다. 서버 통신은 하지 않는다.
 */
import { motion } from 'motion/react'
import type { LadderEntry } from './api'

const COL_WIDTH = 46
const ROW_HEIGHT = 20
const TOP_PAD = 16
const REVEAL_DELAY = 1.7

// 세로줄(start 위치)에서 출발해 위→아래로 rungs(가로줄)를 만날 때마다
// 왼쪽/오른쪽으로 한 칸씩 이동하며 최종 도착 컬럼까지의 전체 경로를 계산한다.
// 이 경로가 곧 사다리를 타고 내려가는 애니메이션 경로가 된다.
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

  // 참가자마다 각자의 시작 위치에서 tracePath로 최종 도착 컬럼까지의 경로를 미리 구해둔다
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
          // 토큰(원)이 경로의 각 컬럼 좌표를 순서대로 지나가도록 애니메이션.
          // cx/cy에 배열을 주면 motion이 그 값들을 순차적으로 보간하며 이동시킨다.
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
      {/* 토큰 이동 애니메이션(REVEAL_DELAY)이 끝난 뒤에 결과 라벨을 페이드인 시켜 보여준다 */}
      <motion.div
        className="ladder-labels bottom"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: REVEAL_DELAY }}
      >
        {paths.map((path, i) => {
          // 경로의 마지막 컬럼이 곧 이 참가자가 최종 도착한 결과 위치
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

/**
 * 돌림판 게임의 원판(SVG) 컴포넌트.
 * WheelPanel로부터 항목 목록/회전 각도/스핀 중 여부를 받아 원판을 그리고
 * 회전 애니메이션만 담당한다. 서버 통신은 하지 않는다.
 */
import { motion } from 'motion/react'
import type { WheelOption } from './api'

const PALETTE = ['#e8622c', '#d9a13c', '#c14e1a', '#8a6410', '#b5793a', '#a8624c']

const R = 90
const CENTER = 100

function pointOnCircle(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return [CENTER + R * Math.sin(rad), CENTER - R * Math.cos(rad)] as const
}

// 두 각도(startDeg~endDeg) 사이의 부채꼴 조각을 그리는 SVG path.
// large-arc-flag(180도 초과 여부)를 계산해 넣어야 항목이 3개 미만일 때도 조각이
// 올바른 방향으로 그려진다.
function slicePath(startDeg: number, endDeg: number) {
  const [x1, y1] = pointOnCircle(startDeg)
  const [x2, y2] = pointOnCircle(endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M${CENTER},${CENTER} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`
}

export function WheelDial({
  options,
  rotation,
  spinning,
}: {
  options: WheelOption[]
  rotation: number
  spinning: boolean
}) {
  const n = options.length
  const seg = n > 0 ? 360 / n : 360

  return (
    <div className="wheel-dial-wrap">
      <div className="wheel-pointer" />
      {/* 부모(WheelPanel)가 계산해 넘겨준 rotation 값까지 회전시킨다.
          spinning일 때만 3.2초짜리 감속 애니메이션을 적용하고,
          아니면 즉시(duration 0) 해당 각도로 맞춘다 */}
      <motion.svg
        className="wheel-dial"
        viewBox="0 0 200 200"
        animate={{ rotate: rotation }}
        transition={
          spinning
            ? { duration: 3.2, ease: [0.12, 0.8, 0.2, 1] }
            : { duration: 0 }
        }
      >
        <circle cx={CENTER} cy={CENTER} r={R} fill="var(--surface)" stroke="var(--border)" />
        {n === 0 && (
          <text x={CENTER} y={CENTER + 30} textAnchor="middle" className="wheel-empty-text">
            항목을 추가하세요
          </text>
        )}
        {n === 1 && (
          <circle cx={CENTER} cy={CENTER} r={R} fill={PALETTE[0]} />
        )}
        {n > 1 &&
          options.map((o, i) => (
            <path key={o.id} d={slicePath(i * seg, (i + 1) * seg)} fill={PALETTE[i % PALETTE.length]} />
          ))}
        {n > 1 &&
          options.map((o, i) => {
            const mid = (i + 0.5) * seg
            const [lx, ly] = pointOnCircle(mid)
            const tx = CENTER + (lx - CENTER) * 0.62
            const ty = CENTER + (ly - CENTER) * 0.62
            return (
              <text
                key={`label-${o.id}`}
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="middle"
                className="wheel-slice-label"
              >
                {o.label.length > 6 ? `${o.label.slice(0, 5)}…` : o.label}
              </text>
            )
          })}
        <circle cx={CENTER} cy={CENTER} r={10} fill="var(--surface)" stroke="var(--border-bright)" />
      </motion.svg>
    </div>
  )
}

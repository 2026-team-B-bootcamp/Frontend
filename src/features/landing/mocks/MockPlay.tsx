import { motion } from 'motion/react'
import { PaletteIcon, TvIcon } from '../../../shared/ui/icons'

/** 같이보기(재생 동기화) + 그림판(실시간 스트로크) 목업. */
export function MockPlay() {
  return (
    <div className="lm-screen">
      <div className="lm-screen-head">
        <TvIcon size={14} /> 같이보기 · <PaletteIcon size={14} /> 그림판
      </div>

      <div className="lm-player">
        <motion.span
          className="lm-player-play"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="lm-player-bar">
          <motion.i
            initial={{ width: '18%' }}
            animate={{ width: '64%' }}
            transition={{ duration: 6, ease: 'linear' }}
          />
        </div>
      </div>
      <div className="lm-player-caption">모두 같은 장면 — 재생·일시정지가 함께 움직여요</div>

      <svg className="lm-board" viewBox="0 0 300 74" aria-hidden>
        <motion.path
          d="M18 52 C 48 14, 84 16, 108 40 S 150 66, 174 44"
          fill="none"
          stroke="var(--lp-coral)"
          strokeWidth="5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
        />
        <motion.path
          d="M150 24 C 186 54, 224 58, 262 30"
          fill="none"
          stroke="var(--lp-sky)"
          strokeWidth="5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 1.1, ease: 'easeOut' }}
        />
        <motion.circle
          cx="272"
          cy="28"
          r="7"
          fill="var(--lp-lime)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2, type: 'spring', stiffness: 380, damping: 18 }}
        />
      </svg>
      <div className="lm-player-caption">내가 그은 선이 채널 전체 화면에 바로 나타나요</div>
    </div>
  )
}

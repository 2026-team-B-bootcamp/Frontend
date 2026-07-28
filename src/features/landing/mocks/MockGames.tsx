import { motion } from 'motion/react'
import { ChainIcon, DiceIcon } from '../../../shared/ui/icons'

const MOCK_BOARD_MARKED = new Set([0, 3, 6, 7, 12, 13, 16, 18, 21, 24])

export function MockGames() {
  return (
    <div className="lm-screen">
      <div className="lm-screen-head">
        <DiceIcon size={14} /> 빙고 · <ChainIcon size={14} /> 끝말잇기 — 미니게임 6종 중 두 판
      </div>
      <div className="lm-bingo">
        {Array.from({ length: 25 }, (_, i) => (
          <motion.span
            key={i}
            className={`lm-cell${MOCK_BOARD_MARKED.has(i) ? ' on' : ''}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.02 * i, duration: 0.25 }}
          >
            {((i * 7) % 25) + 1}
          </motion.span>
        ))}
      </div>
      <div className="lm-chain">
        {['사과', '과일', '일요일', '일기'].map((w, i) => (
          <motion.span
            key={w}
            className={`wc-chip${i % 2 ? ' mine' : ''}`}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.15, type: 'spring', stiffness: 400, damping: 24 }}
          >
            <span className="wc-chip-word">{w}</span>
          </motion.span>
        ))}
      </div>
    </div>
  )
}

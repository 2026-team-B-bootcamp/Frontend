import type { ReactElement } from 'react'
import { motion } from 'motion/react'
import {
  BalancePreview,
  BingoPreview,
  OmokPreview,
  TicTacToePreview,
  WordChainPreview,
} from '../games/GamePreviews'
import { GAME_CARDS } from './content'

// 초성퀴즈만 GamePreviews에 없어서 여기서 같은 문법(40×40 viewBox)으로 그린다.
function ChosungPreview() {
  return (
    <svg viewBox="0 0 40 40" className="game-preview-svg">
      <rect x={3} y={12} width={15} height={16} rx={4} fill="var(--accent-2-bg)" stroke="var(--accent-2-border)" />
      <rect x={22} y={12} width={15} height={16} rx={4} fill="var(--sky-bg)" stroke="var(--sky-border)" />
      <text x={10.5} y={24} textAnchor="middle" className="game-preview-text">
        ㅊ
      </text>
      <text x={29.5} y={24} textAnchor="middle" className="game-preview-text">
        ㅅ
      </text>
    </svg>
  )
}

// 게임 선택 패널(GamePip)이 쓰는 미리보기 그림을 랜딩에서 재사용한다 —
// 목업이 아니라 실제 앱에 있는 그 그림이라 과장이 없다.
const PREVIEWS = {
  bingo: BingoPreview,
  wordchain: WordChainPreview,
  omok: OmokPreview,
  tictactoe: TicTacToePreview,
  balance: BalancePreview,
  chosung: ChosungPreview,
} satisfies Record<(typeof GAME_CARDS)[number]['key'], () => ReactElement>

export function GamesGrid() {
  return (
    <section className="landing-section">
      <motion.p
        className="landing-eyebrow"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.4 }}
      >
        MINI GAMES
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.4 }}
      >
        오늘은 뭐 하고 친해질까요
      </motion.h2>
      <div className="landing-games">
        {GAME_CARDS.map((g, i) => {
          const Preview = PREVIEWS[g.key]
          return (
            <motion.div
              key={g.key}
              className="game-card"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.06 * i }}
              whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }}
            >
              <span className="game-card-art">
                <Preview />
              </span>
              <div className="game-card-name">{g.name}</div>
              <div className="game-card-desc">{g.desc}</div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

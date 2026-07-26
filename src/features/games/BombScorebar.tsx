/**
 * 폭탄 돌리기류(끝말잇기·초성퀴즈) 공용 표시 조각 둘 — 점수바와 종료 배너.
 * 둘 다 BombGameState + userId만 받아 그리는 순수 표시용이라 한 파일에 묶었다.
 */
import { motion } from 'motion/react'
import type { BombGameState } from './bombGame'

/** 점수바 — 살아있는지(dead)·지금 폭탄을 든 차례인지(turn)를 배지로 표시한다. */
export function BombScorebar({ state, userId }: { state: BombGameState; userId: number | null }) {
  return (
    <div className="panel-scorebar">
      {state.players.map((p) => (
        <span
          key={p.user_id}
          className={`score${
            state.status === 'finished' && p.user_id === state.loser_user_id ? ' dead' : ''
          }${state.status === 'playing' && p.user_id === state.turn_user_id ? ' turn' : ''}`}
        >
          {state.status === 'playing' && p.user_id === state.turn_user_id && '💣 '}
          {p.display_name}
          {p.user_id === userId && ' (나)'}
        </span>
      ))}
    </div>
  )
}

/** 종료 배너 — 내가 폭탄을 들고 터뜨렸는지(lose) 아닌지(win)로 문구가 갈린다. */
export function BombFinishedBanner({
  state,
  userId,
}: {
  state: BombGameState
  userId: number | null
}) {
  return (
    <motion.div
      className={`banner ${state.loser_user_id === userId ? 'lose' : 'win'}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {state.loser_user_id === userId
        ? '💥 폭탄이 터졌어요… 벌칙 당첨!'
        : `💣 ${
            state.players.find((p) => p.user_id === state.loser_user_id)?.display_name ??
            '누군가'
          }님 손에서 폭탄이 터졌어요!`}
    </motion.div>
  )
}

/**
 * 틱택토(1:1) 패널 — 서버 통신(참여/착수/초기화), 턴 관리, 승리 연출을 담당한다.
 * 흐름: TicTacToePanel → tictactoe/api.ts → shared/api/client.ts → 백엔드 tictactoe 라우터.
 * 판 그리기는 TicTacToeBoard에 위임한다. 구조는 오목 패널과 동일하다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../../auth/authContext'
import {
  X,
  getTicTacToe,
  joinTicTacToe,
  placeMark,
  resetTicTacToe,
  type TicTacToeState,
} from './api'
import { ApiError } from '../../../shared/api/client'
import { fireWinConfetti } from '../../../shared/lib/confetti'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'
import { TicTacToeBoard } from './TicTacToeBoard'

export function TicTacToePanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const { userId } = useAuth()
  const [state, setState] = useState<TicTacToeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const prevWinnerRef = useRef<number | null>(null)

  const refetch = useCallback(() => {
    getTicTacToe(channelId)
      .then((s) => setState(s))
      .catch(() => {
        // 일시적 실패는 마지막 상태 유지
      })
      .finally(() => setLoading(false))
  }, [channelId])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'tictactoe.state') setState(e.payload as unknown as TicTacToeState)
        else if (e.type === 'ws.open') refetch()
      }),
    [subscribe, refetch],
  )

  const winner = state?.winner_user_id ?? null
  const finished = state?.status === 'finished'

  useEffect(() => {
    if (finished && winner !== null && prevWinnerRef.current === null && winner === userId) {
      fireWinConfetti()
    }
    prevWinnerRef.current = finished ? winner : null
  }, [finished, winner, userId])

  async function run(fn: () => Promise<TicTacToeState>) {
    setBusy(true)
    setError(null)
    try {
      setState(await fn())
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '요청에 실패했습니다')
      return false
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="muted panel-note">불러오는 중…</p>

  const me = state?.players.find((p) => p.user_id === userId) ?? null
  const amPlayer = me !== null
  const seats = state?.players.length ?? 0

  if (state === null || (!amPlayer && seats < 2 && !finished)) {
    return (
      <div className="panel-empty">
        {error && <div className="error">{error}</div>}
        <p className="muted panel-note">
          {state === null || seats === 0
            ? '아직 게임이 없어요. 3×3 판에서 한 줄(가로·세로·대각)을 먼저 만들면 이겨요.'
            : '상대가 기다리고 있어요 — 지금 참여할 수 있어요.'}
        </p>
        <button className="btn" onClick={() => run(() => joinTicTacToe(channelId))} disabled={busy}>
          {busy ? '참여 중…' : seats === 0 ? '게임 열기' : '게임 참여'}
        </button>
      </div>
    )
  }

  const isMyTurn = amPlayer && state.status === 'playing' && state.turn === me!.mark
  const boardDisabled = !amPlayer || state.status !== 'playing' || !isMyTurn

  const markLabel = (mark: number) => (mark === X ? '✕' : '○')

  let banner: string | null = null
  if (finished) {
    if (winner === null) banner = '무승부예요'
    else if (winner === userId) banner = '한 줄 완성! 승리했어요 🎉'
    else {
      const w = state.players.find((p) => p.user_id === winner)
      banner = `${w?.display_name ?? '상대'}님이 이겼어요`
    }
  }

  return (
    <div className="ttt-panel">
      {error && <div className="error">{error}</div>}

      {banner && (
        <motion.div
          className={`banner ${winner === userId ? 'win' : 'lose'}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {banner}
        </motion.div>
      )}

      <div className="panel-scorebar">
        {state.players.map((p) => {
          const cls = ['score']
          if (p.user_id === userId) cls.push('me')
          if (state.status === 'playing' && state.turn === p.mark) cls.push('turn')
          return (
            <span key={p.user_id} className={cls.join(' ')}>
              {markLabel(p.mark)} {p.display_name}
            </span>
          )
        })}
      </div>

      <TicTacToeBoard
        board={state.board}
        winningLine={state.winning_line}
        lastMove={state.last_move}
        onPlace={(row, col) => run(() => placeMark(channelId, row, col))}
        disabled={boardDisabled || busy}
      />

      {finished ? (
        <button
          className="btn"
          style={{ marginTop: 12 }}
          onClick={() => run(() => joinTicTacToe(channelId))}
          disabled={busy}
        >
          {busy ? '시작 중…' : '새 게임'}
        </button>
      ) : state.status === 'playing' ? (
        <p className="muted panel-note">
          {!amPlayer
            ? '관전 중이에요'
            : isMyTurn
              ? '내 차례예요 — 둘 곳을 누르세요'
              : '상대 차례예요'}
        </p>
      ) : (
        <>
          <p className="muted panel-note">상대를 기다리는 중이에요…</p>
          <button className="btn" onClick={() => run(() => resetTicTacToe(channelId))} disabled={busy}>
            그만두기
          </button>
        </>
      )}
    </div>
  )
}

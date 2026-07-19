import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../../auth/authContext'
import { clickBingo, getBingo, joinBingo, type BingoState } from './api'
import { ApiError } from '../../../shared/api/client'
import { BingoBoard } from './BingoBoard'
import { fireWinConfetti } from '../../../shared/lib/confetti'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'

export function BingoPanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const { userId } = useAuth()
  const [state, setState] = useState<BingoState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const prevWinnerRef = useRef<number | null>(null)

  const winner = state?.winner_user_id ?? null
  const inGame = state !== null && state.my_board !== null

  const refetch = useCallback(() => {
    getBingo(channelId)
      .then((s) => setState(s))
      .catch(() => {
        // 일시적 실패는 마지막 상태 유지
      })
      .finally(() => setLoading(false))
  }, [channelId])

  useEffect(() => {
    refetch()
  }, [refetch])

  // WS 이벤트(bingo.update)나 재연결 때만 서버 상태를 다시 가져온다 — 폴링 없음
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'bingo.update' || e.type === 'ws.open') refetch()
      }),
    [subscribe, refetch],
  )

  // 승자가 새로 정해진 순간 내가 이겼으면 축하 연출
  useEffect(() => {
    if (winner !== null && prevWinnerRef.current === null && winner === userId) {
      fireWinConfetti()
    }
    prevWinnerRef.current = winner
  }, [winner, userId])

  async function onJoin() {
    setBusy(true)
    setError(null)
    try {
      setState(await joinBingo(channelId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '참여에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  async function onCellClick(n: number) {
    if (winner !== null) return
    try {
      setState(await clickBingo(channelId, n))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '클릭에 실패했습니다')
    }
  }

  if (loading) return <p className="muted panel-note">불러오는 중…</p>

  if (!inGame) {
    const roundOver = state !== null && state.winner_user_id !== null
    return (
      <div className="panel-empty">
        {error && <div className="error">{error}</div>}
        <p className="muted panel-note">
          {state === null
            ? '아직 게임이 없어요. 1~25 숫자 보드로 함께 빙고를 즐겨보세요.'
            : roundOver
              ? '이전 라운드가 끝났어요. 참여하면 새 라운드가 시작됩니다.'
              : '게임이 진행 중이에요 — 지금 참여할 수 있어요.'}
        </p>
        <button className="btn" onClick={onJoin} disabled={busy}>
          {busy ? '참여 중…' : state === null ? '게임 열기' : '게임 참여'}
        </button>
      </div>
    )
  }

  const called = new Set(state.called_numbers)
  const me = state.players.find((p) => p.user_id === userId)
  const others = state.players.filter((p) => p.user_id !== userId)

  return (
    <div className="bingo-panel">
      {error && <div className="error">{error}</div>}

      {winner !== null && (
        <motion.div
          className={`banner ${winner === userId ? 'win' : 'lose'}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {winner === userId
            ? '3줄 완성! 승리했어요 🎉'
            : `${state.players.find((p) => p.user_id === winner)?.display_name ?? '상대'}님이 먼저 3줄을 완성했어요`}
        </motion.div>
      )}

      <div className="panel-scorebar">
        <span className="score me">나 {me?.completed_lines ?? 0}줄</span>
        {others.map((o) => (
          <span key={o.user_id} className="score">
            {o.display_name} {o.completed_lines}줄
          </span>
        ))}
      </div>

      <BingoBoard
        board={state.my_board ?? []}
        called={called}
        onCellClick={onCellClick}
        disabled={winner !== null}
      />

      {winner !== null ? (
        <button className="btn" style={{ marginTop: 14 }} onClick={onJoin} disabled={busy}>
          {busy ? '시작 중…' : '새 라운드 시작'}
        </button>
      ) : (
        <p className="muted panel-note">칸을 누르면 모두에게 그 숫자가 호출돼요</p>
      )}
    </div>
  )
}

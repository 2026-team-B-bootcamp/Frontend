/**
 * 빙고 게임 패널 — 대기 로비(2명+ 시작) → 진행 → 종료를 관리하고, 참가/시작/클릭 통신과 승리 연출을 담당한다.
 * 흐름: BingoPanel → bingo/api.ts → 백엔드 빙고 라우터. 판 그리기는 BingoBoard에 위임한다.
 * 진행 중 채널에 들어온(참가 못 한) 사람은 관전자로서 호출 숫자·점수만 본다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../../auth/authContext'
import { clickBingo, getBingo, joinBingo, startBingo, type BingoState } from './api'
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

  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'bingo.update' || e.type === 'ws.open') refetch()
      }),
    [subscribe, refetch],
  )

  const winner = state?.winner_user_id ?? null
  useEffect(() => {
    if (winner !== null && prevWinnerRef.current === null && winner === userId) {
      fireWinConfetti()
    }
    prevWinnerRef.current = winner
  }, [winner, userId])

  async function run(fn: () => Promise<BingoState>) {
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

  async function onCellClick(n: number) {
    if (winner !== null) return
    try {
      setState(await clickBingo(channelId, n))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '클릭에 실패했습니다')
    }
  }

  if (loading) return <p className="muted panel-note">불러오는 중…</p>

  const isPlayer = state !== null && state.my_board !== null
  const players = state?.players ?? []
  const called = new Set(state?.called_numbers ?? [])
  const me = players.find((p) => p.user_id === userId)
  const others = players.filter((p) => p.user_id !== userId)

  // 점수바(공용) — 나 먼저, 나머지 순
  const scorebar = (
    <div className="panel-scorebar">
      {me && <span className="score me">나 {me.completed_lines}줄</span>}
      {others.map((o) => (
        <span key={o.user_id} className="score">
          {o.display_name} {o.completed_lines}줄
        </span>
      ))}
    </div>
  )

  // 게임 없음 → 열기
  if (state === null) {
    return (
      <div className="panel-empty">
        {error && <div className="error">{error}</div>}
        <p className="muted panel-note">
          아직 게임이 없어요. 2명 이상 모이면 1~25 숫자 빙고를 시작할 수 있어요.
        </p>
        <button className="btn" onClick={() => run(() => joinBingo(channelId))} disabled={busy}>
          {busy ? '여는 중…' : '게임 열기'}
        </button>
      </div>
    )
  }

  // 대기 로비
  if (state.status === 'waiting') {
    return (
      <div className="bingo-panel">
        {error && <div className="error">{error}</div>}
        <div className="bingo-lobby">
          <p className="muted panel-note">대기 중 — 2명 이상 모이면 시작할 수 있어요</p>
          <div className="bingo-lobby-players">
            {players.map((p) => (
              <span key={p.user_id} className={`score${p.user_id === userId ? ' me' : ''}`}>
                {p.display_name}
              </span>
            ))}
          </div>
          {!isPlayer ? (
            <button className="btn" onClick={() => run(() => joinBingo(channelId))} disabled={busy}>
              {busy ? '참여 중…' : '게임 참여'}
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => run(() => startBingo(channelId))}
              disabled={busy || players.length < 2}
            >
              {busy ? '시작 중…' : `게임 시작 (${players.length}명)`}
            </button>
          )}
        </div>
      </div>
    )
  }

  const roundOver = state.status === 'finished'

  // 관전자(진행 중 참가 못 함) — 호출 숫자·점수만 표시
  if (!isPlayer) {
    return (
      <div className="bingo-panel">
        {error && <div className="error">{error}</div>}
        {roundOver && winner !== null && (
          <div className="banner lose">
            {players.find((p) => p.user_id === winner)?.display_name ?? '누군가'}님이 승리했어요
          </div>
        )}
        {scorebar}
        <p className="muted panel-note">관전 중이에요 — 호출된 숫자</p>
        <div className="bingo-called">
          {state.called_numbers.length === 0 ? (
            <span className="muted">아직 호출된 숫자가 없어요</span>
          ) : (
            state.called_numbers.map((n) => (
              <span key={n} className="bingo-called-chip">
                {n}
              </span>
            ))
          )}
        </div>
        {roundOver && (
          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={() => run(() => joinBingo(channelId))}
            disabled={busy}
          >
            {busy ? '시작 중…' : '새 게임 참여'}
          </button>
        )}
      </div>
    )
  }

  // 플레이어 — 진행/종료
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
            : `${players.find((p) => p.user_id === winner)?.display_name ?? '상대'}님이 먼저 3줄을 완성했어요`}
        </motion.div>
      )}

      {scorebar}

      <BingoBoard
        board={state.my_board ?? []}
        called={called}
        onCellClick={onCellClick}
        disabled={winner !== null}
      />

      {roundOver ? (
        <button
          className="btn"
          style={{ marginTop: 14 }}
          onClick={() => run(() => joinBingo(channelId))}
          disabled={busy}
        >
          {busy ? '시작 중…' : '새 라운드 시작'}
        </button>
      ) : (
        <p className="muted panel-note">칸을 누르면 모두에게 그 숫자가 호출돼요</p>
      )}
    </div>
  )
}

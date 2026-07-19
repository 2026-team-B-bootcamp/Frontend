/**
 * 오목 게임의 패널 컴포넌트 — 서버와의 통신(참여/착수/초기화), 턴 관리, 승리 연출을 모두 이 파일이 담당한다.
 * 흐름: OmokPanel(여기) → omok/api.ts → shared/api/client.ts → 백엔드 오목 라우터.
 * 실제 판 그리기는 OmokBoard에 위임하고, 여기서는 상태 관리와 이벤트 처리만 한다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../../auth/authContext'
import { BLACK, getOmok, joinOmok, placeStone, resetOmok, type OmokState } from './api'
import { ApiError } from '../../../shared/api/client'
import { fireWinConfetti } from '../../../shared/lib/confetti'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'
import { OmokBoard } from './OmokBoard'

export function OmokPanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const { userId } = useAuth()
  const [state, setState] = useState<OmokState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const prevWinnerRef = useRef<number | null>(null)

  const refetch = useCallback(() => {
    getOmok(channelId)
      .then((s) => setState(s))
      .catch(() => {
        // 일시적 실패는 마지막 상태 유지
      })
      .finally(() => setLoading(false))
  }, [channelId])

  useEffect(() => {
    refetch()
  }, [refetch])

  // omok.state 이벤트는 서버가 매 착수마다 최신 판 상태를 그대로 보내주므로 바로 반영하고,
  // 재연결(ws.open) 시에는 최신 상태를 다시 조회한다
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'omok.state') {
          setState(e.payload as unknown as OmokState)
        } else if (e.type === 'ws.open') {
          refetch()
        }
      }),
    [subscribe, refetch],
  )

  const winner = state?.winner_user_id ?? null
  const finished = state?.status === 'finished'

  // 게임이 막 끝났고(finished) 그 승자가 새로 정해진 순간(이전엔 없었음) 나라면 축하 연출
  useEffect(() => {
    if (finished && winner !== null && prevWinnerRef.current === null && winner === userId) {
      fireWinConfetti()
    }
    prevWinnerRef.current = finished ? winner : null
  }, [finished, winner, userId])

  // 참여/착수/초기화처럼 서버에 요청을 보내는 동작들을 공통 처리(로딩·에러 상태 관리)하는 헬퍼
  async function run(fn: () => Promise<OmokState>) {
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

  // 아직 판이 없거나, 내가 플레이어가 아니고 자리도 남아 있으면 참여 화면
  if (state === null || (!amPlayer && seats < 2 && !finished)) {
    return (
      <div className="panel-empty">
        {error && <div className="error">{error}</div>}
        <p className="muted panel-note">
          {state === null || seats === 0
            ? '아직 게임이 없어요. 15줄 판에서 5목을 먼저 완성하면 이겨요.'
            : '상대가 기다리고 있어요 — 지금 참여할 수 있어요.'}
        </p>
        <button className="btn" onClick={() => run(() => joinOmok(channelId))} disabled={busy}>
          {busy ? '참여 중…' : seats === 0 ? '게임 열기' : '게임 참여'}
        </button>
      </div>
    )
  }

  // 내 턴인지 판정: 플레이어이고, 게임이 진행 중이며, 서버가 알려준 현재 턴 색이 내 돌 색과 같을 때
  const isMyTurn = amPlayer && state.status === 'playing' && state.turn === me!.color
  // 플레이어가 아니거나, 게임 중이 아니거나, 내 턴이 아니면 보드를 눌러도 반응하지 않는다
  const boardDisabled = !amPlayer || state.status !== 'playing' || !isMyTurn

  function stoneLabel(color: number) {
    return color === BLACK ? '흑' : '백'
  }

  // 게임이 끝났을 때 보여줄 배너 문구 — 무승부 / 내 승리(위 useEffect에서 confetti도 함께 터짐) / 상대 승리로 구분
  let banner: string | null = null
  if (finished) {
    if (winner === null) banner = '무승부예요'
    else if (winner === userId) banner = '5목 완성! 승리했어요 🎉'
    else {
      const w = state.players.find((p) => p.user_id === winner)
      banner = `${w?.display_name ?? '상대'}님이 5목을 완성했어요`
    }
  }

  return (
    <div className="omok-panel">
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
          if (state.status === 'playing' && state.turn === p.color) cls.push('turn')
          return (
            <span key={p.user_id} className={cls.join(' ')}>
              {stoneLabel(p.color)} {p.display_name}
            </span>
          )
        })}
      </div>

      <OmokBoard
        board={state.board}
        winningLine={state.winning_line}
        lastMove={state.last_move}
        onPlace={(row, col) => run(() => placeStone(channelId, row, col))}
        disabled={boardDisabled || busy}
      />

      {finished ? (
        <button
          className="btn"
          style={{ marginTop: 12 }}
          onClick={() => run(() => joinOmok(channelId))}
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
          <button
            className="btn"
            onClick={() => run(() => resetOmok(channelId))}
            disabled={busy}
          >
            그만두기
          </button>
        </>
      )}
    </div>
  )
}

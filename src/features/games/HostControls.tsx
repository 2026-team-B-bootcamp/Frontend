/**
 * 방장(판을 연 사람)에게만 보이는 게임 강제 종료 버튼.
 *
 * 게임 6종이 저마다 상태 구조는 달라도 "누가 열었나(host_user_id)"와
 * "판을 접는다"는 똑같아서, 그 부분만 여기 한 곳에 모았다.
 * 종료 결과를 받는 쪽은 useGameEnded.ts에 있다.
 */
import { useState } from 'react'
import { endGame } from './endGame'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../auth/authContext'
import type { GameKind } from './gameKinds'

export function HostEndButton({
  channelId,
  kind,
  hostUserId,
}: {
  channelId: number
  kind: GameKind
  // 백엔드가 내려준 방장. 내가 아니면 아무것도 그리지 않는다(권한은 서버가 다시 막는다).
  hostUserId: number | null | undefined
}) {
  const { userId } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (hostUserId == null || hostUserId !== userId) return null

  async function onEnd() {
    if (!window.confirm('이 판을 지금 끝낼까요? 진행 중인 내용은 사라져요.')) return
    setBusy(true)
    setError(null)
    try {
      await endGame(channelId, kind)
      // 화면 정리는 여기서 하지 않는다 — 백엔드가 쏜 game.ended가 나를 포함한
      // 모두에게 돌아오고, useGameEnded가 그걸 받아 한 경로로 처리한다.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '종료하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="host-end">
      {error && <div className="error">{error}</div>}
      <button type="button" className="btn ghost host-end-btn" onClick={onEnd} disabled={busy}>
        {busy ? '종료 중…' : '게임 강제 종료'}
      </button>
      <span className="muted host-end-note">방장인 나만 보여요</span>
    </div>
  )
}

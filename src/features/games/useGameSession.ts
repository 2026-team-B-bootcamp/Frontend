/**
 * 6개 게임 패널에 똑같이 반복되던 "서버 상태 하나 들고 있기" 뼈대를 모았다.
 * state/loading/error/busy 상태, 최초 조회(refetch), 방장 강제종료(useGameEnded),
 * "{kind}.state" WS 이벤트 구독, 변경 요청 공통 래퍼(run)까지 여기서 처리한다.
 *
 * 🚨 WS 처리에 예외가 정확히 2개 있다 — bingo와 balance. 이 둘은 표준
 * "{kind}.state 페이로드를 그대로 새 상태로" 패턴을 못 따른다:
 *  - bingo: `bingo.update` 페이로드에 전체 상태가 없어 매번 refetch()해야 한다.
 *  - balance: `balance.state`에 my_vote가 없어 이전 값을 유지해야 한다.
 * 이 둘은 `handleStateEvent: false`로 이 훅의 자동 구독을 끄고, 패널에서 원래
 * 하던 대로 자기만의 subscribe 이펙트를 그대로 둔다(state/setState/refetch만 여기서
 * 받아 씀). 콜백 옵션으로 일반화하면 매 렌더 새 함수 참조 때문에 구독을 계속
 * 껐다 켜야 해서 오히려 하나의 인라인 콜백을 예외 없이 강제하는 이 편이 더 안전하다.
 */
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'
import { useGameEnded } from './useGameEnded'
import type { GameKind } from './gameKinds'

export function useGameSession<T>(
  kind: GameKind,
  channelId: number,
  subscribe: Subscribe,
  fetchState: (channelId: number) => Promise<T | null>,
  options: { handleStateEvent?: boolean } = {},
) {
  const { handleStateEvent = true } = options

  const [state, setState] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refetch = useCallback(() => {
    fetchState(channelId)
      .then((s) => setState(s))
      .catch(() => {
        // 일시적 실패는 마지막 상태 유지
      })
      .finally(() => setLoading(false))
  }, [channelId, fetchState])

  useEffect(() => {
    refetch()
  }, [refetch])

  // 방장이 판을 접으면 판 자체가 사라진다 — "게임 없음" 화면으로 되돌린다
  useGameEnded(kind, subscribe, () => setState(null))

  useEffect(() => {
    if (!handleStateEvent) return
    return subscribe((e) => {
      if (e.type === `${kind}.state`) {
        setState(e.payload as T)
      } else if (e.type === 'ws.open') {
        refetch()
      }
    })
  }, [subscribe, refetch, kind, handleStateEvent])

  async function run(fn: () => Promise<T>) {
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

  return { state, setState, loading, error, setError, busy, run, refetch }
}

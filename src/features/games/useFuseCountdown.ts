/**
 * 폭탄 돌리기류(끝말잇기·초성퀴즈) 공용 훅 둘.
 * 도화선 카운트다운과 생존자 컨페티는 서로 다른 관심사지만 둘 다 "state가 갱신될
 * 때마다 반응하는 자잘한 파생 로직"이라 별도 파일을 늘리지 않고 여기 묶었다.
 */
import { useEffect, useRef, useState } from 'react'
import { fireWinConfetti } from '../../shared/lib/confetti'
import type { BombGameState } from './bombGame'

/**
 * Fuse 위젯의 로컬 카운트다운. 서버 상태(state.seconds_left)가 갱신될 때마다 그
 * 값으로 다시 맞추고(렌더 중 상태 보정 — effect 없이 파생 상태를 동기화), 매초 1씩
 * 줄이다 0이 되면 refetch로 서버의 최신 판정을 받는다. 폭탄이 터지는 패배 처리는
 * 서버 담당이고, 여기선 표시용 도화선만 탄다.
 */
export function useFuseCountdown(state: BombGameState | null, refetch: () => void) {
  const [seconds, setSeconds] = useState<number | null>(null)

  const [syncedState, setSyncedState] = useState<BombGameState | null>(null)
  if (state !== syncedState) {
    setSyncedState(state)
    setSeconds(state?.seconds_left ?? null)
  }

  useEffect(() => {
    if (state?.status !== 'playing' || seconds === null) return
    if (seconds <= 0) {
      refetch()
      return
    }
    const t = setTimeout(() => setSeconds((s) => (s !== null ? s - 1 : s)), 1000)
    return () => clearTimeout(t)
  }, [seconds, state?.status, refetch])

  return seconds
}

/**
 * playing → finished로 바뀐 순간, 내가 패자가 아니라면(살아남았으면) 컨페티를 터뜨린다.
 */
export function useBombSurvivorConfetti(state: BombGameState | null, userId: number | null) {
  const prevStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (
      state?.status === 'finished' &&
      prevStatusRef.current === 'playing' &&
      state.loser_user_id !== userId &&
      state.players.some((p) => p.user_id === userId)
    ) {
      fireWinConfetti()
    }
    prevStatusRef.current = state?.status ?? null
  }, [state, userId])
}

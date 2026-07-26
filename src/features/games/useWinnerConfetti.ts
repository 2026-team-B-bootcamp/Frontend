/**
 * 오목·틱택토 공용 — "게임이 막 끝났고(finished) 그 승자가 새로 정해진 순간(이전엔
 * 없었음) 나라면" 축하 컨페티를 터뜨리는 훅. finished가 아닐 때 prevWinnerRef를
 * null로 되돌려서, 재대국이 시작돼도 다음 승리에 다시 반응한다.
 */
import { useEffect, useRef } from 'react'
import { fireWinConfetti } from '../../shared/lib/confetti'

export function useWinnerConfetti(
  finished: boolean,
  winner: number | null,
  userId: number | null,
) {
  const prevWinnerRef = useRef<number | null>(null)

  useEffect(() => {
    if (finished && winner !== null && prevWinnerRef.current === null && winner === userId) {
      fireWinConfetti()
    }
    prevWinnerRef.current = finished ? winner : null
  }, [finished, winner, userId])
}

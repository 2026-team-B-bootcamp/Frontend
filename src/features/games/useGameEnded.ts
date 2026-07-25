/**
 * 방장이 판을 접었을 때 각 게임 패널이 "게임 없음"으로 되돌아가게 해주는 훅.
 *
 * 판이 사라진 상태에는 실어 보낼 게 없어서, 백엔드는 게임별 "…state" 이벤트 대신
 * 종류만 담은 공통 이벤트(game.ended) 하나를 쏜다. 여기서 내 게임인지만 가려낸다.
 *
 * 컴포넌트(HostControls.tsx)와 파일을 나눈 이유는 fast refresh다 —
 * 한 파일이 컴포넌트와 훅을 함께 내보내면 HMR이 통째로 리로드된다.
 */
import { useEffect } from 'react'
import type { GameEndedPayload } from './endGame'
import type { GameKind } from './gameKinds'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'

export function useGameEnded(kind: GameKind, subscribe: Subscribe, onEnded: () => void) {
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type !== 'game.ended') return
        if ((e.payload as unknown as GameEndedPayload).kind === kind) onEnded()
      }),
    // onEnded는 패널마다 인라인 함수로 넘어와 매 렌더 새 참조가 된다. 의존성에
    // 넣으면 렌더마다 구독을 끊었다 다시 걸어 이벤트를 흘릴 수 있어 제외한다.
    // 하는 일이 setState(null) 한 줄이라 옛 참조를 잡고 있어도 결과가 같다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscribe, kind],
  )
}

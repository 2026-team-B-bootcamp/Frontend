/**
 * 방장의 게임 강제 종료 — 게임 종류에 상관없이 같은 엔드포인트 하나를 쓴다.
 *
 * 백엔드도 games 라우터에 하나로 모아뒀다(POST .../games/{kind}/end). 하는 일이
 * "방장인지 확인하고 판을 지운다"뿐이라 게임마다 다를 게 없어서다. 성공하면 판이
 * 통째로 사라지고(=게임 없음), 채널의 모두에게 game.ended 이벤트가 날아간다.
 */
import { apiFetch } from '../../shared/api/client'
import type { GameKind } from './gameKinds'

export function endGame(channelId: number, kind: GameKind) {
  return apiFetch<{ status: string }>(`/channels/${channelId}/games/${kind}/end`, {
    method: 'POST',
  })
}

/** game.ended 이벤트의 payload — 어느 게임이 누구 손에 끝났는지. */
export interface GameEndedPayload {
  kind: string
  by_user_id: number
  by_name: string
}

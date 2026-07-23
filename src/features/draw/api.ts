/**
 * 공유 그림판(Whiteboard) API 계층 — apiFetch로 백엔드 draw 라우터에 요청한다.
 * Whiteboard 컴포넌트가 획 전송/전체 지우기/초기 조회에 사용한다.
 */
import { apiFetch } from '../../shared/api/client'

// 정규화(0..1) 좌표 목록 + 색상 + 굵기로 이뤄진 획. user_id는 서버가 채운다.
export interface Stroke {
  points: number[][]
  color: string
  width: number
  user_id: number
}

// 내가 그린 획 하나를 서버에 저장하고 채널 전체에 방송한다
export function sendStroke(
  channelId: number,
  stroke: { points: number[][]; color: string; width: number },
) {
  return apiFetch<Stroke>(`/channels/${channelId}/draw/stroke`, {
    method: 'POST',
    body: stroke,
  })
}

// 캔버스를 비운다 — 서버가 저장된 획을 지우고 전원에게 clear를 방송한다
export function clearDraw(channelId: number) {
  return apiFetch<void>(`/channels/${channelId}/draw/clear`, { method: 'POST' })
}

// 지금까지 쌓인 모든 획을 받아온다(초기 로드 / 늦게 들어온 사람 동기화)
export function getDraw(channelId: number) {
  return apiFetch<{ strokes: Stroke[] }>(`/channels/${channelId}/draw`)
}

/**
 * 함께 보기(Watch Together) API 계층 — apiFetch로 백엔드 watch 라우터에 요청한다.
 * WatchTogether 컴포넌트가 파티 시작/동기화/종료/조회에 사용한다.
 */
import { apiFetch } from '../../shared/api/client'

export interface WatchState {
  active: boolean
  video_id: string | null
  playing: boolean
  position: number
  host_user_id: number | null
  host_name: string | null
}

// 유튜브 URL(또는 영상 ID)로 파티를 시작한다 — 서버가 ID를 뽑아 저장하고 전원에 방송한다
export function startWatch(channelId: number, url: string) {
  return apiFetch<WatchState>(`/channels/${channelId}/watch/start`, {
    method: 'POST',
    body: { url },
  })
}

// 내 재생 상태(재생/일시정지 + 현재 위치)를 서버에 알려 모두를 맞춘다
export function syncWatch(channelId: number, playing: boolean, position: number) {
  return apiFetch<WatchState>(`/channels/${channelId}/watch/sync`, {
    method: 'POST',
    body: { playing, position },
  })
}

export function stopWatch(channelId: number) {
  return apiFetch<WatchState>(`/channels/${channelId}/watch/stop`, { method: 'POST' })
}

export function getWatch(channelId: number) {
  return apiFetch<WatchState>(`/channels/${channelId}/watch`)
}

/**
 * 채널의 미니게임별 현재 상태(none/waiting/playing/finished)를 가져오고 실시간으로 갱신하는 훅.
 * 게임 종류별로 각각 열릴 수 있으므로(레지스트리 폐기), 이 상태로 관전 유도 뱃지(🙂/🟢/🚩)를 그린다.
 * 게임 관련 WS 이벤트가 올 때마다 다시 조회하고, 시간제 종료(밸런스 등)를 위해 주기적으로도 갱신한다.
 */
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../shared/api/client'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'

export type GameStatus = 'none' | 'waiting' | 'playing' | 'finished'
export type GamesStatus = Record<string, GameStatus>

const GAME_EVENTS = [
  'bingo.update',
  'wordchain.state',
  'omok.state',
  'tictactoe.state',
  'balance.state',
  'chosung.state',
  'ws.open',
]

export function getGamesStatus(channelId: number) {
  return apiFetch<GamesStatus>(`/channels/${channelId}/games/status`)
}

export function useGamesStatus(channelId: number, subscribe: Subscribe): GamesStatus {
  const [status, setStatus] = useState<GamesStatus>({})

  const refetch = useCallback(() => {
    if (!Number.isFinite(channelId)) return
    getGamesStatus(channelId)
      .then(setStatus)
      .catch(() => {
        // 상태 뱃지는 부가정보라 실패해도 조용히 넘어간다
      })
  }, [channelId])

  useEffect(() => {
    refetch()
  }, [refetch])

  // 게임 관련 이벤트가 오면 상태를 다시 집계한다
  useEffect(() => subscribe((e) => {
    if (GAME_EVENTS.includes(e.type)) refetch()
  }), [subscribe, refetch])

  // 시간제 종료(밸런스 마감 등)는 이벤트가 없으므로 주기적으로도 갱신한다
  useEffect(() => {
    if (!Number.isFinite(channelId)) return
    const id = setInterval(refetch, 15000)
    return () => clearInterval(id)
  }, [channelId, refetch])

  return status
}

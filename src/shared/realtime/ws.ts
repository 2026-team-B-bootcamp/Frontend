// 채널 실시간 통신을 담당하는 저수준(low-level) WebSocket 래퍼.
// REST(client.ts)와 별개로, 새 메시지/게임 상태/접속자 등을 서버가 즉시 밀어주는 통로다.
// 연결이 끊기면 자동으로 재연결을 시도하고, useChannelSocket 훅이 이 함수를 사용한다.
import { BASE_URL } from '../api/client'

export interface WsEvent {
  type: string
  payload: Record<string, unknown>
}

export interface ChannelSocket {
  close: () => void
  sendTyping: () => void
}

const WS_BASE = BASE_URL.replace(/^http/, 'ws')

/**
 * 채널 WebSocket 연결. 끊기면 지수 백오프로 자동 재연결하고,
 * (재)연결 성공 시 onEvent({type: 'ws.open'})을 쏴서 놓친 데이터를 refetch하게 한다.
 */
export function connectChannelSocket(
  channelId: number,
  token: string,
  onEvent: (event: WsEvent) => void,
): ChannelSocket {
  let ws: WebSocket | null = null
  let closed = false
  let retryMs = 500
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  // 실제 WebSocket 연결을 여는 함수. onclose에서 자기 자신을 다시 호출해 재연결한다.
  function open() {
    if (closed) return
    // 인증 토큰을 쿼리스트링으로 실어 보낸다 (WebSocket은 커스텀 헤더를 못 붙이므로 이 방식 사용)
    ws = new WebSocket(
      `${WS_BASE}/ws/channels/${channelId}?token=${encodeURIComponent(token)}`,
    )
    ws.onopen = () => {
      retryMs = 500 // 연결 성공하면 재시도 간격 초기화
      onEvent({ type: 'ws.open', payload: {} })
    }
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data && typeof data.type === 'string') {
          onEvent({ type: data.type, payload: data.payload ?? {} })
        }
      } catch {
        // 형식이 깨진 이벤트는 무시
      }
    }
    ws.onclose = (event) => {
      ws = null
      if (closed) return
      // 인증·권한 실패(토큰 만료/멤버 아님 등)로 닫혔으면 재연결해도 계속 거부당하므로
      // 무한 재시도를 멈추고, 전역 로그아웃 흐름(AuthContext가 듣는 이벤트)을 깨운다.
      if (event.code === 4400 || event.code === 4401 || event.code === 4403) {
        closed = true
        window.dispatchEvent(new Event('auth:unauthorized'))
        return
      }
      // 그 외(네트워크 순단 등)는 지수 백오프로 재연결: 간격을 매번 2배로 늘리되 최대 5초.
      retryTimer = setTimeout(open, retryMs)
      retryMs = Math.min(retryMs * 2, 5000)
    }
    ws.onerror = () => {
      ws?.close()
    }
  }

  open()

  return {
    close() {
      closed = true
      if (retryTimer) clearTimeout(retryTimer)
      ws?.close()
    },
    sendTyping() {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'typing' }))
      }
    },
  }
}

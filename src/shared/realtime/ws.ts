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

  function open() {
    if (closed) return
    ws = new WebSocket(
      `${WS_BASE}/ws/channels/${channelId}?token=${encodeURIComponent(token)}`,
    )
    ws.onopen = () => {
      retryMs = 500
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
    ws.onclose = () => {
      ws = null
      if (closed) return
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

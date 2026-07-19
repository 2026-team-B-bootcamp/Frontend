import { useCallback, useEffect, useRef, useState } from 'react'
import { connectChannelSocket, type ChannelSocket, type WsEvent } from './ws'

export type WsListener = (event: WsEvent) => void
export type Subscribe = (listener: WsListener) => () => void

export interface Typer {
  name: string
  until: number
}

/**
 * 채널 소켓 수명 관리 + 이벤트 분류.
 * - presence.update / typing 은 상태로 흡수
 * - 나머지(message.new, bingo.update, wordchain.state, ws.open)는
 *   subscribe(listener)로 구독하는 소비자에게 그대로 전달
 */
export function useChannelSocket(channelId: number, token: string | null) {
  const [online, setOnline] = useState<Set<number>>(() => new Set())
  const [typers, setTypers] = useState<Map<number, Typer>>(() => new Map())
  const sockRef = useRef<ChannelSocket | null>(null)
  const listenersRef = useRef<Set<WsListener>>(new Set())

  useEffect(() => {
    if (!token || !Number.isFinite(channelId)) return
    const sock = connectChannelSocket(channelId, token, (e) => {
      if (e.type === 'presence.update') {
        const users = (e.payload.users as { user_id: number }[] | undefined) ?? []
        setOnline(new Set(users.map((u) => u.user_id)))
      } else if (e.type === 'typing') {
        const uid = e.payload.user_id as number
        const name = e.payload.display_name as string
        setTypers((prev) => {
          const next = new Map(prev)
          next.set(uid, { name, until: Date.now() + 3000 })
          return next
        })
      } else {
        listenersRef.current.forEach((listener) => listener(e))
      }
    })
    sockRef.current = sock

    const pruner = setInterval(() => {
      setTypers((prev) => {
        const now = Date.now()
        if (![...prev.values()].some((t) => t.until <= now)) return prev
        const next = new Map<number, Typer>()
        for (const [uid, t] of prev) {
          if (t.until > now) next.set(uid, t)
        }
        return next
      })
    }, 1000)

    return () => {
      clearInterval(pruner)
      sock.close()
      sockRef.current = null
      setOnline(new Set())
      setTypers(new Map())
    }
  }, [channelId, token])

  const subscribe = useCallback<Subscribe>((listener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const sendTyping = useCallback(() => {
    sockRef.current?.sendTyping()
  }, [])

  return { subscribe, online, typers, sendTyping }
}

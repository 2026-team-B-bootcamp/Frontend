/**
 * 채팅 메시지 목록의 로드/실시간 반영/무한 스크롤을 모두 담당하는 훅.
 *
 * 얽혀 있는 지점이 셋 있는데, 억지로 풀지 않고 그대로 옮겼다:
 * 1) initialIds는 최초 로드(listMessages 성공 시)와 loadOlder(과거 페이지 prepend) 두 경로에서
 *    갱신되고, 렌더 루프(message/MessageList)가 소비한다. 셋이 흩어지면 prepend된 과거
 *    메시지에 입장 애니메이션이 붙어 화면이 튄다.
 * 2) prependingRef ↔ 자동 스크롤 이펙트. loadOlder가 flag를 세우고 [messages.length] 이펙트가
 *    소비한다. flushSync로 DOM 반영을 동기로 끝낸 직후(페인트 전)에 scrollTop을 보정하는
 *    3줄(prependingRef 세팅 / flushSync 블록 / scrollTop 보정)은 재배치하면 안 된다.
 * 3) hasMore/loadingOlder를 state+ref로 이중화했다 — IntersectionObserver 콜백이
 *    stale closure를 잡아도 최신 값으로 판단하기 위해서다.
 */
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { createWelcome, listMessages, type Message } from './api'
import { ApiError } from '../../shared/api/client'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'

// 백엔드 list_messages의 limit과 같은 값 — 응답이 이보다 적으면 "더 없음"으로 판정
const PAGE_SIZE = 50

export function useMessageFeed({
  channelId,
  subscribe,
  userId,
  setError,
}: {
  channelId: number
  subscribe: Subscribe
  userId: number | null
  setError: (message: string) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  // 첫 페이지 로딩이 끝났는지 — 끝나기 전에는 "대화의 시작" 빈 화면을 그리지 않는다
  // (채널 전환 때마다 빈 화면 → 메시지 목록으로 번쩍 바뀌는 플리커의 원인이었다)
  const [firstLoadDone, setFirstLoadDone] = useState(false)
  const [initialIds, setInitialIds] = useState<Set<number> | null>(null)
  const cursorRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const scrolledOnceRef = useRef(false)

  // --- 무한 스크롤(과거 메시지) 상태 ---
  // hasMore/loadingOlder는 렌더용 state와 별개로 ref에도 들고 있는다:
  // IntersectionObserver 콜백이 stale closure를 잡아도 최신 값으로 판단하기 위해서다.
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const hasMoreRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const oldestIdRef = useRef<number | null>(null)
  const prependingRef = useRef(false)
  const logRef = useRef<HTMLDivElement | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)

  // 새로 받은 메시지를 기존 목록에 합치는 핵심 함수.
  // 이미 가진 id는 걸러내 중복을 막고(초기 로드 + 실시간 수신이 겹칠 수 있음),
  // cursorRef에 가장 큰 메시지 id를 기억해뒀다가 재연결 시 "그 이후만" 다시 불러오는 데 쓴다.
  function merge(incoming: Message[]) {
    if (incoming.length === 0) return
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id))
      const fresh = incoming.filter((m) => !known.has(m.id))
      // 반드시 id(=시간) 오름차순으로 정렬한다. 초기 로드와 실시간 수신이 동시에
      // 진행되면 도착 순서가 뒤섞일 수 있는데(느린 연결에서 라이브 메시지가 첫
      // 페이지보다 먼저 도착 등), 정렬하지 않으면 영구히 뒤죽박죽 렌더된다.
      // 날짜 구분선·Slack 그룹핑도 오름차순을 전제로 한다.
      return fresh.length ? [...prev, ...fresh].sort((a, b) => a.id - b.id) : prev
    })
    cursorRef.current = Math.max(cursorRef.current, ...incoming.map((m) => m.id))
  }

  // 채널에 처음 들어왔을 때 최근 메시지 목록을 불러온다 (chat/api.ts → 백엔드)
  useEffect(() => {
    let active = true
    listMessages(channelId)
      .then((msgs) => {
        if (active) {
          merge(msgs)
          setInitialIds(new Set(msgs.map((m) => m.id)))
          // 첫 페이지가 꽉 차지 않았다면 이 채널엔 더 오래된 메시지가 없다
          if (msgs.length < PAGE_SIZE) {
            hasMoreRef.current = false
            setHasMore(false)
          }
          setFirstLoadDone(true)
          // 이 채널에서 아직 한 마디도 안 한 사람이면 환영·자기소개 카드를 남긴다.
          // "처음인지"는 백엔드가 DB로 판정하므로 여기선 그냥 부르기만 하면 되고,
          // 두 번째부터는 null이 돌아와 아무 일도 일어나지 않는다.
          createWelcome(channelId)
            .then((card) => {
              if (active && card) merge([card])
            })
            .catch(() => {
              // 환영 카드는 있으면 좋은 것 — 실패해도 채팅엔 지장이 없다
            })
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : '메시지를 불러오지 못했습니다')
          setFirstLoadDone(true)
        }
      })
    return () => {
      active = false
    }
    // setError는 ChatRoom의 useState 세터를 그대로 물려받은 참조라 항상 안정적이다
  }, [channelId, setError])

  // 실시간: 새 메시지는 WS로 밀려오고, 재연결 시엔 커서 이후만 다시 가져온다
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'message.new') {
          merge([e.payload as Message])
        } else if (e.type === 'message.deleted') {
          // 누군가 자기 메시지를 지웠다 — 열려 있는 모든 화면에서 즉시 사라진다
          const { id } = e.payload as { id: number }
          setMessages((prev) => prev.filter((m) => m.id !== id))
        } else if (e.type === 'ws.open') {
          listMessages(channelId, cursorRef.current || undefined)
            .then(merge)
            .catch(() => {
              // 다음 이벤트에서 복구됨
            })
        }
      }),
    [subscribe, channelId],
  )

  // 가장 오래된 메시지 id를 ref로 추적 — loadOlder가 stale closure 없이 커서로 쓴다
  useEffect(() => {
    oldestIdRef.current = messages[0]?.id ?? null
  }, [messages])

  // 위로 스크롤해 센티널이 보이면 과거 메시지 한 페이지를 앞에 붙인다.
  // 핵심은 스크롤 보정: prepend로 늘어난 높이만큼 scrollTop을 되돌려 화면이 튀지 않게 한다.
  async function loadOlder() {
    const el = logRef.current
    const beforeId = oldestIdRef.current
    if (!el || beforeId == null || loadingOlderRef.current || !hasMoreRef.current) return
    loadingOlderRef.current = true
    setLoadingOlder(true)
    try {
      const older = await listMessages(channelId, undefined, beforeId)
      if (older.length < PAGE_SIZE) {
        hasMoreRef.current = false
        setHasMore(false)
      }
      if (older.length > 0) {
        // 아래 length-변경 효과(바닥 자동 스크롤)가 이번 갱신을 건너뛰도록 표시
        prependingRef.current = true
        const prevHeight = el.scrollHeight
        // flushSync로 DOM 반영을 동기로 끝낸 직후(페인트 전) scrollTop을 보정한다
        flushSync(() => {
          // prepend되는 과거 메시지는 입장 애니메이션 없이 그리도록 initialIds에 편입
          setInitialIds((prev) => {
            const next = new Set(prev ?? [])
            older.forEach((m) => next.add(m.id))
            return next
          })
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id))
            const fresh = older.filter((m) => !known.has(m.id))
            return fresh.length ? [...fresh, ...prev] : prev
          })
        })
        el.scrollTop += el.scrollHeight - prevHeight
      }
    } catch {
      // 실패해도 치명적이지 않다 — 스크롤을 다시 움직이면 재시도된다
    } finally {
      loadingOlderRef.current = false
      setLoadingOlder(false)
    }
  }

  // 목록 최상단 센티널 감시 — 보이면(위로 120px 여유) 과거 페이지 로드
  useEffect(() => {
    const sentinel = topRef.current
    const root = logRef.current
    if (!sentinel || !root) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadOlder()
      },
      { root, rootMargin: '120px 0px 0px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
    // 센티널은 hasMore && 메시지 존재 시에만 렌더되므로, 그 조건이 바뀔 때 다시 붙인다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, messages.length === 0])

  useEffect(() => {
    if (messages.length === 0) return
    if (prependingRef.current) {
      // 과거 메시지 prepend는 위에서 위치를 보정했으니 바닥으로 끌어내리지 않는다
      prependingRef.current = false
      return
    }
    const log = logRef.current
    const last = messages[messages.length - 1]
    // 사용자가 히스토리를 읽으려고 위로 올려둔 상태라면, 새 메시지가 와도 바닥으로
    // 끌어내리지 않는다(무한스크롤의 취지). 단, ①첫 진입, ②내가 보낸 메시지,
    // ③이미 바닥 근처(120px)일 때는 자동으로 따라 내려간다.
    const nearBottom =
      !log || log.scrollHeight - log.scrollTop - log.clientHeight < 120
    const isOwn = last?.user_id === userId
    if (!scrolledOnceRef.current || isOwn || nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: scrolledOnceRef.current ? 'smooth' : 'auto' })
    }
    scrolledOnceRef.current = true
    // messages.length만으로 충분(내용 변경은 길이 변화를 동반) — userId는 세션 내 불변
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  return {
    messages,
    setMessages,
    firstLoadDone,
    initialIds,
    hasMore,
    loadingOlder,
    merge,
    logRef,
    topRef,
    bottomRef,
  }
}

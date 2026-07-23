/**
 * 실제 채팅 로그를 그리고 메시지를 보내는 컴포넌트 — 이 화면의 핵심.
 * 메시지 전송/조회는 chat/api.ts(sendMessage, listMessages)가 백엔드로 요청을 보내고,
 * 남이 보낸 메시지는 ChatPage에서 내려준 subscribe(useChannelSocket)로 실시간 수신한다.
 * 그 외에 관심사 태그가 겹치는 멤버에게 AI 아이스브레이커 질문을 붙여넣는 기능도 여기에 있다.
 */
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../auth/authContext'
import { getMembers, type Member } from '../servers/api'
import {
  createWelcome,
  deleteMessage,
  getIcebreaker,
  listMessages,
  sendMessage,
  type Message,
} from './api'
import { TagPills } from '../users/TagPills'
import { highlightRichText, renderRichText } from './richText'
import { LinkPreview } from './LinkPreview'
import { firstHttpUrl } from './linkPreviewApi'
import { EmojiPicker } from './EmojiPicker'
import { GifPicker } from './GifPicker'
import {
  BoldIcon,
  CodeIcon,
  EmojiIcon,
  GifIcon,
  ItalicIcon,
  SparkIcon,
  StrikeIcon,
  TrashIcon,
} from '../../shared/ui/icons'
import { Avatar } from '../../shared/ui/Avatar'
import { ApiError } from '../../shared/api/client'
import { avatarColor } from '../../shared/lib/colors'
import type { Subscribe, Typer } from '../../shared/realtime/useChannelSocket'

// 같은 사람이 5분 안에 연달아 보낸 메시지는 Slack처럼 헤더 없이 묶어서 표시
const GROUP_WINDOW_MS = 5 * 60 * 1000

// 백엔드 list_messages의 limit과 같은 값 — 응답이 이보다 적으면 "더 없음"으로 판정
const PAGE_SIZE = 50

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function dayKey(iso: string) {
  return new Date(iso).toDateString()
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export function ChatRoom({
  serverId,
  channelId,
  channelName,
  subscribe,
  typers,
  sendTyping,
}: {
  serverId: number
  channelId: number
  channelName?: string
  subscribe: Subscribe
  typers: Map<number, Typer>
  sendTyping: () => void
}) {
  const { userId } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  // 첫 페이지 로딩이 끝났는지 — 끝나기 전에는 "대화의 시작" 빈 화면을 그리지 않는다
  // (채널 전환 때마다 빈 화면 → 메시지 목록으로 번쩍 바뀌는 플리커의 원인이었다)
  const [firstLoadDone, setFirstLoadDone] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  // 입력창 위 이모지/GIF 팝오버 — 한 번에 하나만 연다
  const [picker, setPicker] = useState<'emoji' | 'gif' | null>(null)
  // 고른 GIF는 바로 보내지 않고 입력창 위에 썸네일로 대기시켰다가 전송한다
  const [pendingGif, setPendingGif] = useState<string | null>(null)

  const [ibOpen, setIbOpen] = useState(false)
  const [ibMembers, setIbMembers] = useState<Member[] | null>(null)
  const [ibBusy, setIbBusy] = useState(false)
  // 아이스브레이커 3단계 상태: 멤버 선택 → 관심사 선택 → 질문 후보 중 선택
  const [ibTarget, setIbTarget] = useState<Member | null>(null)
  const [ibSelTags, setIbSelTags] = useState<string[]>([])
  const [ibQuestions, setIbQuestions] = useState<string[] | null>(null)

  const [initialIds, setInitialIds] = useState<Set<number> | null>(null)
  const cursorRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  // 입력창 뒤에 서식을 그리는 백드롭 — textarea 스크롤과 동기화한다
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const lastTypingRef = useRef(0)
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
  }, [channelId])

  // 실시간: 새 메시지는 WS로 밀려오고, 재연결 시엔 커서 이후만 다시 가져온다
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'message.new') {
          merge([e.payload as unknown as Message])
        } else if (e.type === 'message.deleted') {
          // 누군가 자기 메시지를 지웠다 — 열려 있는 모든 화면에서 즉시 사라진다
          const { id } = e.payload as unknown as { id: number }
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

  function onDraftChange(value: string) {
    setDraft(value)
    const now = Date.now()
    if (value && now - lastTypingRef.current > 1500) {
      lastTypingRef.current = now
      sendTyping()
    }
  }

  // 메시지 전송: sendMessage api가 백엔드에 POST하고, 응답으로 받은 메시지를 바로 merge해서
  // 내 화면에 즉시 반영한다 (다른 사람에게는 실시간 이벤트로 전달됨)
  async function doSend(content: string) {
    const trimmed = content.trim()
    if (!trimmed || sending) return
    setSending(true)
    setError(null)
    try {
      const msg = await sendMessage(channelId, trimmed)
      merge([msg])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '전송에 실패했습니다')
      throw err
    } finally {
      setSending(false)
    }
  }

  function resetEditorHeight() {
    const el = inputRef.current
    if (el) el.style.height = 'auto'
  }

  async function submit() {
    const text = draft.trim()
    if (!text && !pendingGif) return
    try {
      // 텍스트 먼저, 그다음 GIF를 각각 한 메시지로 보낸다(렌더러는 GIF URL 단독일 때만 이미지로 임베드)
      if (text) await doSend(text)
      if (pendingGif) {
        await doSend(pendingGif)
        setPendingGif(null)
      }
      setDraft('')
      resetEditorHeight()
    } catch {
      // 실패 시 입력 내용은 남겨둔다
    }
  }

  function onSend(e: FormEvent) {
    e.preventDefault()
    void submit()
  }

  // Enter로 전송, Shift+Enter는 줄바꿈. 한글 조합 중(Enter로 글자 확정)에는 전송하지 않는다.
  function onEditorKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit()
    }
  }

  // textarea가 스크롤되면 뒤 백드롭도 같은 위치로 맞춘다
  function onEditorScroll() {
    const el = inputRef.current
    const bd = backdropRef.current
    if (el && bd) bd.scrollTop = el.scrollTop
  }

  // 내용에 맞춰 입력창 높이를 늘린다(최대 140px, 그 이상은 스크롤)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
    if (backdropRef.current) backdropRef.current.scrollTop = el.scrollTop
  }, [draft])

  // 선택 영역을 서식 마커로 감싼다 (툴바 B/I/S/코드). 선택이 없으면 마커만 넣고 커서를 사이에 둔다.
  function wrapSelection(before: string, after: string) {
    const el = inputRef.current
    const start = el?.selectionStart ?? draft.length
    const end = el?.selectionEnd ?? draft.length
    const sel = draft.slice(start, end)
    const next = draft.slice(0, start) + before + sel + after + draft.slice(end)
    setDraft(next)
    requestAnimationFrame(() => {
      el?.focus()
      const caret = start + before.length
      el?.setSelectionRange(caret, caret + sel.length)
    })
  }

  // 커서 위치에 텍스트(이모지 등)를 삽입한다
  function insertAtCaret(text: string) {
    const el = inputRef.current
    const start = el?.selectionStart ?? draft.length
    const end = el?.selectionEnd ?? draft.length
    const next = draft.slice(0, start) + text + draft.slice(end)
    setDraft(next)
    requestAnimationFrame(() => {
      el?.focus()
      const caret = start + text.length
      el?.setSelectionRange(caret, caret)
    })
  }

  // GIF는 바로 보내지 않고 입력창 위에 썸네일로 대기시킨다 — 사용자가 확인 후 전송(또는 X로 취소).
  function onPickGif(url: string) {
    setPicker(null)
    setPendingGif(url)
    inputRef.current?.focus()
  }

  // AI 질문을 타자기처럼 한 글자씩 입력창에 채워넣는다 (originkit Typewriter의
  // 재귀 setTimeout 상태머신 패턴을 입력창에 맞게 축약 이식)
  const typeTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (typeTimer.current) clearTimeout(typeTimer.current)
    },
    [],
  )

  function typeIntoDraft(text: string) {
    if (typeTimer.current) clearTimeout(typeTimer.current)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDraft(text)
      return
    }
    let i = 0
    const tick = () => {
      i++
      setDraft(text.slice(0, i))
      if (i < text.length) {
        typeTimer.current = window.setTimeout(tick, 16 + Math.random() * 28)
      }
    }
    setDraft('')
    typeTimer.current = window.setTimeout(tick, 120)
  }

  // 내 메시지를 지운다. 낙관적으로 먼저 화면에서 빼고, 실패하면 되돌린다 —
  // 지우기는 즉시 반응해야 자연스럽고, 실패는 드물다.
  async function onDeleteMessage(id: number) {
    const snapshot = messages
    setMessages((prev) => prev.filter((m) => m.id !== id))
    try {
      await deleteMessage(channelId, id)
    } catch (err) {
      setMessages(snapshot)
      setError(err instanceof ApiError ? err.message : '메시지를 지우지 못했습니다')
    }
  }

  async function toggleIbPicker() {
    if (ibOpen) {
      setIbOpen(false)
      return
    }
    setIbOpen(true)
    setIbMembers(null)
    setIbTarget(null)
    setIbQuestions(null)
    try {
      setIbMembers(await getMembers(serverId))
    } catch {
      setIbMembers([])
    }
  }

  // 멤버를 고르면 바로 질문을 만들지 않고, 어떤 관심사로 물을지 먼저 고르게 한다
  function onPickIbTarget(m: Member) {
    const realTags = m.tags.filter((t) => t && t.trim().length > 0)
    setIbTarget(m)
    setIbSelTags([]) // 기본은 미선택 — 물어보고 싶은 관심사만 직접 고르게 한다
    setIbQuestions(null)
    // 관심사 태그가 없는 멤버는 고를 게 없으니 바로 일반 질문을 뽑는다
    if (realTags.length === 0) void generateIbQuestions(m, null)
  }

  function toggleIbTag(tag: string) {
    setIbSelTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  // 고른 관심사로 AI 질문 후보(최대 3개)를 받아온다. 같은 관심사 조합은
  // 백엔드가 캐시해 두므로 두 번째부터는 LLM 호출 없이 바로 온다.
  async function generateIbQuestions(target: Member, tags: string[] | null) {
    setIbBusy(true)
    try {
      const r = await getIcebreaker(serverId, target.user_id, tags ?? undefined)
      setIbQuestions(r.questions)
    } catch {
      setError('아이스브레이커 생성에 실패했습니다')
    } finally {
      setIbBusy(false)
    }
  }

  // 후보 중 하나를 고르면 입력창에 타자기처럼 채워넣는다
  function onPickIbQuestion(question: string) {
    setIbOpen(false)
    inputRef.current?.focus()
    typeIntoDraft(question)
  }

  const ibTargets = ibMembers?.filter((m) => m.user_id !== userId) ?? []
  const ibTargetTags = ibTarget?.tags.filter((t) => t && t.trim().length > 0) ?? []
  const typingNames = [...typers.entries()]
    .filter(([uid]) => uid !== userId)
    .map(([, t]) => t.name)

  return (
    <>
      {error && (
        <div className="error" style={{ padding: '0 20px' }}>
          {error}
        </div>
      )}

      <div className="chat-log" ref={logRef}>
        {/* 무한 스크롤: 더 있으면 감시용 센티널(+로딩 표시), 끝이면 시작 안내 */}
        {messages.length > 0 &&
          (hasMore ? (
            <div ref={topRef} style={{ minHeight: 28, textAlign: 'center' }}>
              {loadingOlder && <span className="muted">이전 메시지 불러오는 중…</span>}
            </div>
          ) : (
            <div className="chat-day">
              {channelName ? `#${channelName}` : '이 채널'} 대화의 시작이에요
            </div>
          ))}
        {messages.length === 0 ? (
          firstLoadDone && (
          <div className="chat-empty">
            <span className="chat-empty-hash">#</span>
            <p className="chat-empty-title">
              {channelName ? `#${channelName}` : '이 채널'} 의 시작이에요
            </p>
            <p className="muted">
              첫 인사를 건네보세요 — 멤버의 관심사 태그를 보고 말을 걸면 더 쉬워요.
            </p>
          </div>
          )
        ) : (
          messages.map((m, i) => {
            const prev = i > 0 ? messages[i - 1] : null
            const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at)
            const grouped =
              !newDay &&
              prev !== null &&
              prev.user_id === m.user_id &&
              new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() <
                GROUP_WINDOW_MS
            const hasTags = m.tags.some((t) => t && t.trim().length > 0)
            // 내 메시지에만 삭제 버튼을 붙이기 위한 판정.
            // (한때 내 메시지를 오른쪽으로 정렬해봤지만 아바타만 넘어가고 글은 그대로라
            //  어색해서 되돌렸다 — 디스코드처럼 모두 왼쪽 정렬로 둔다)
            const mine = m.user_id === userId
            // 채널 진입 시 처음 불러온 메시지들은 애니메이션 없이 바로 보여주고,
            // 그 이후 실시간으로 도착하는 메시지만 슬라이드 인 한다.
            const isInitial = initialIds?.has(m.id) ?? true
            return (
              <motion.div
                key={m.id}
                initial={isInitial ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {newDay && <div className="chat-day">{dayLabel(m.created_at)}</div>}
                {/* 첫 입장 환영·자기소개 카드는 말풍선이 아니라 가운데 카드로 그린다 */}
                {m.kind === 'welcome' ? (
                  <div className="chat-welcome">
                    <Avatar
                      userId={m.user_id}
                      name={m.display_name}
                      url={m.avatar_url}
                      size={32}
                    />
                    <div className="chat-welcome-body">
                      <span className="chat-welcome-label">
                        <SparkIcon size={12} /> 환영합니다
                      </span>
                      <p className="chat-welcome-text">{m.content}</p>
                      {hasTags && <TagPills tags={m.tags} />}
                    </div>
                  </div>
                ) : (
                <div className={`chat-row${grouped ? ' grouped' : ''}`}>
                  {grouped ? (
                    <span className="chat-gutter">{timeLabel(m.created_at)}</span>
                  ) : (
                    <Avatar userId={m.user_id} name={m.display_name} url={m.avatar_url} />
                  )}
                  <div className="chat-body">
                    {!grouped && (
                      <div className="chat-head">
                        <span className="chat-name" style={{ color: avatarColor(m.user_id) }}>
                          {m.display_name}
                        </span>
                        {/* 발신자 이름 옆 관심사 태그 (겹치는 태그 하이라이트는 common prop이 있을 때만) */}
                        {hasTags && <TagPills tags={m.tags} />}
                        <span className="chat-time">{timeLabel(m.created_at)}</span>
                      </div>
                    )}
                    {/* 내 메시지에만 삭제 버튼 — 평소엔 숨어 있다가 행에 마우스를 올리면 나온다 */}
                    {mine && (
                      <button
                        type="button"
                        className="chat-delete"
                        title="메시지 삭제"
                        aria-label="메시지 삭제"
                        onClick={() => onDeleteMessage(m.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                    <div className="chat-text">{renderRichText(m.content)}</div>
                    {(() => {
                      // renderRichText가 이미 이미지/유튜브 단독 메시지는 임베드하므로 그 경우는 건너뛴다.
                      const trimmed = m.content.trim()
                      const standalone = /^https?:\/\/\S+$/i.test(trimmed)
                      const isYouTube =
                        /(^|\.)(youtube\.com|youtu\.be|m\.youtube\.com|youtube-nocookie\.com)/i.test(trimmed)
                      const isMedia =
                        /\.(gif|png|jpe?g|webp)(\?[^\s]*)?$/i.test(trimmed) ||
                        /(^|\.)(tenor|giphy)\.com/i.test(trimmed)
                      if (standalone && (isYouTube || isMedia)) return null
                      const link = firstHttpUrl(m.content)
                      return link ? <LinkPreview url={link} /> : null
                    })()}
                  </div>
                </div>
                )}
              </motion.div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="typing-bar">
        <AnimatePresence>
          {typingNames.length > 0 && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <span className="typing-dots">
                <i />
                <i />
                <i />
              </span>
              {typingNames.join(', ')}님이 입력 중…
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={onSend} className="chat-input">
        <AnimatePresence>
        {ibOpen && (
          <motion.div
            className="ib-popover"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {ibTarget === null ? (
              /* 1단계: 누구에게 말을 걸지 멤버 선택 */
              <>
                <div className="ib-popover-title">
                  누구에게 말을 걸까요? AI가 첫 질문을 만들어드려요
                </div>
                {ibMembers === null ? (
                  <p className="muted" style={{ padding: '4px 8px' }}>
                    멤버 불러오는 중…
                  </p>
                ) : ibTargets.length === 0 ? (
                  <p className="muted" style={{ padding: '4px 8px' }}>
                    아직 다른 멤버가 없습니다
                  </p>
                ) : (
                  ibTargets.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      className="ib-target"
                      disabled={ibBusy}
                      onClick={() => onPickIbTarget(m)}
                    >
                      <span
                        className="chat-avatar"
                        style={{ background: avatarColor(m.user_id) }}
                      >
                        {m.display_name.charAt(0)}
                      </span>
                      <span className="ib-target-name">{m.display_name}</span>
                      {/* common_with_me: 나와 겹치는 태그 — TagPills가 강조 표시해줌 */}
                      <TagPills tags={m.tags} common={m.common_with_me} />
                    </button>
                  ))
                )}
              </>
            ) : ibQuestions === null ? (
              /* 2단계: 어떤 관심사에 대해 질문할지 선택 (기본 전체 선택) */
              <>
                <div className="ib-popover-title">
                  {ibTarget.display_name}님의 어떤 관심사로 말을 걸까요?
                </div>
                {ibTargetTags.length === 0 ? (
                  <p className="muted" style={{ padding: '4px 8px' }}>
                    아직 관심사가 없는 멤버예요 — 일반 질문을 만드는 중…
                  </p>
                ) : (
                  <div className="ib-tag-select">
                    {ibTargetTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`ib-tag-choice${ibSelTags.includes(tag) ? ' selected' : ''}`}
                        onClick={() => toggleIbTag(tag)}
                        disabled={ibBusy}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                <div className="ib-actions">
                  <button
                    type="button"
                    className="ib-back"
                    disabled={ibBusy}
                    onClick={() => setIbTarget(null)}
                  >
                    ← 멤버 다시 고르기
                  </button>
                  {ibTargetTags.length > 0 && (
                    <button
                      type="button"
                      className="btn ib-generate"
                      disabled={ibBusy || ibSelTags.length === 0}
                      onClick={() => generateIbQuestions(ibTarget, ibSelTags)}
                    >
                      {ibBusy ? '질문 만드는 중…' : '질문 만들기'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* 3단계: AI가 만든 질문 후보 중 하나 선택 */
              <>
                <div className="ib-popover-title">마음에 드는 질문을 골라 보내보세요</div>
                {/* AI가 만든 질문은 위에서부터 차례로 스며들듯 나타난다 — "지금 막 생성됐다"는 느낌 */}
                {ibQuestions.map((q, i) => (
                  <motion.button
                    key={q}
                    type="button"
                    className="ib-question"
                    onClick={() => onPickIbQuestion(q)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: i * 0.09, ease: 'easeOut' }}
                  >
                    {q}
                  </motion.button>
                ))}
                <div className="ib-actions">
                  <button
                    type="button"
                    className="ib-back"
                    onClick={() => setIbQuestions(null)}
                  >
                    ← 관심사 다시 고르기
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        <AnimatePresence>
          {picker === 'emoji' && (
            <EmojiPicker onPick={(ch) => insertAtCaret(ch)} onClose={() => setPicker(null)} />
          )}
          {picker === 'gif' && <GifPicker onPick={onPickGif} onClose={() => setPicker(null)} />}
        </AnimatePresence>

        {/* 서식 툴바 — 선택 영역을 마크다운 마커로 감싸거나 이모지/GIF 팝오버를 연다 */}
        <div className="chat-toolbar">
          <button type="button" className="fmt-btn" title="굵게" onClick={() => wrapSelection('**', '**')}>
            <BoldIcon size={18} />
          </button>
          <button type="button" className="fmt-btn" title="기울임" onClick={() => wrapSelection('_', '_')}>
            <ItalicIcon size={18} />
          </button>
          <button type="button" className="fmt-btn" title="취소선" onClick={() => wrapSelection('~~', '~~')}>
            <StrikeIcon size={18} />
          </button>
          <button type="button" className="fmt-btn" title="코드" onClick={() => wrapSelection('`', '`')}>
            <CodeIcon size={18} />
          </button>
          <span className="chat-toolbar-sep" />
          <button
            type="button"
            className={`fmt-btn${picker === 'emoji' ? ' active' : ''}`}
            title="이모지"
            onClick={() => setPicker((p) => (p === 'emoji' ? null : 'emoji'))}
          >
            <EmojiIcon size={18} />
          </button>
          <button
            type="button"
            className={`fmt-btn${picker === 'gif' ? ' active' : ''}`}
            title="GIF"
            onClick={() => setPicker((p) => (p === 'gif' ? null : 'gif'))}
          >
            <GifIcon size={18} />
          </button>
        </div>

        {/* 전송 대기 중인 GIF — 링크가 아니라 실제 GIF 썸네일로 보여준다 */}
        <AnimatePresence>
          {pendingGif && (
            <motion.div
              className="chat-attach"
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <img src={pendingGif} className="chat-attach-gif" alt="첨부한 GIF" />
              <button
                type="button"
                className="chat-attach-remove"
                onClick={() => setPendingGif(null)}
                title="GIF 빼기"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="chat-input-row">
          <button
            type="button"
            className={`icon-btn ib-spark-btn${ibOpen ? ' active' : ''}`}
            onClick={toggleIbPicker}
            disabled={ibBusy}
            title="AI 아이스브레이커"
          >
            <SparkIcon size={22} />
          </button>
          {/* 입력창 = 투명 textarea + 뒤 백드롭. 백드롭이 서식을 그려 타이핑 자리에 바로 스타일이 보인다.
              편집·한글 IME·커서는 네이티브 textarea가 그대로 처리한다. */}
          <div className="chat-editor">
            <div className="chat-editor-backdrop" ref={backdropRef} aria-hidden="true">
              {highlightRichText(draft)}
            </div>
            <textarea
              ref={inputRef}
              className="chat-editor-input"
              rows={1}
              placeholder={channelName ? `#${channelName} 에 메시지 보내기` : '메시지 입력…'}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={onEditorKeyDown}
              onScroll={onEditorScroll}
              maxLength={1000}
            />
          </div>
          <button className="btn" type="submit" disabled={sending}>
            전송
          </button>
        </div>
      </form>
    </>
  )
}

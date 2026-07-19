import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../auth/authContext'
import { getMembers, type Member } from '../servers/api'
import { getIcebreaker, listMessages, sendMessage, type Message } from './api'
import { TagPills } from '../users/TagPills'
import { SparkIcon } from '../../shared/ui/icons'
import { ApiError } from '../../shared/api/client'
import { avatarColor } from '../../shared/lib/colors'
import type { Subscribe, Typer } from '../../shared/realtime/useChannelSocket'

// 같은 사람이 5분 안에 연달아 보낸 메시지는 Slack처럼 헤더 없이 묶어서 표시
const GROUP_WINDOW_MS = 5 * 60 * 1000

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
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const [ibOpen, setIbOpen] = useState(false)
  const [ibMembers, setIbMembers] = useState<Member[] | null>(null)
  const [ibBusy, setIbBusy] = useState(false)

  const cursorRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const lastTypingRef = useRef(0)

  function merge(incoming: Message[]) {
    if (incoming.length === 0) return
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id))
      const fresh = incoming.filter((m) => !known.has(m.id))
      return fresh.length ? [...prev, ...fresh] : prev
    })
    cursorRef.current = Math.max(cursorRef.current, ...incoming.map((m) => m.id))
  }

  useEffect(() => {
    let active = true
    listMessages(channelId)
      .then((msgs) => {
        if (active) merge(msgs)
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : '메시지를 불러오지 못했습니다')
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function onDraftChange(value: string) {
    setDraft(value)
    const now = Date.now()
    if (value && now - lastTypingRef.current > 1500) {
      lastTypingRef.current = now
      sendTyping()
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault()
    const content = draft.trim()
    if (!content) return
    setSending(true)
    setError(null)
    try {
      const msg = await sendMessage(channelId, content)
      merge([msg])
      setDraft('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '전송에 실패했습니다')
    } finally {
      setSending(false)
    }
  }

  async function toggleIbPicker() {
    if (ibOpen) {
      setIbOpen(false)
      return
    }
    setIbOpen(true)
    setIbMembers(null)
    try {
      setIbMembers(await getMembers(serverId))
    } catch {
      setIbMembers([])
    }
  }

  async function onPickIbTarget(targetId: number) {
    setIbBusy(true)
    try {
      const r = await getIcebreaker(serverId, targetId)
      setDraft(r.question)
      setIbOpen(false)
      inputRef.current?.focus()
    } catch {
      setError('아이스브레이커 생성에 실패했습니다')
    } finally {
      setIbBusy(false)
    }
  }

  const ibTargets = ibMembers?.filter((m) => m.user_id !== userId) ?? []
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

      <div className="chat-log">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-hash">#</span>
            <p className="chat-empty-title">
              {channelName ? `#${channelName}` : '이 채널'} 의 시작이에요
            </p>
            <p className="muted">
              첫 인사를 건네보세요 — 멤버의 관심사 태그를 보고 말을 걸면 더 쉬워요.
            </p>
          </div>
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
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {newDay && <div className="chat-day">{dayLabel(m.created_at)}</div>}
                <div className={`chat-row${grouped ? ' grouped' : ''}`}>
                  {grouped ? (
                    <span className="chat-gutter">{timeLabel(m.created_at)}</span>
                  ) : (
                    <div className="chat-avatar" style={{ background: avatarColor(m.user_id) }}>
                      {m.display_name.charAt(0)}
                    </div>
                  )}
                  <div className="chat-body">
                    {!grouped && (
                      <div className="chat-head">
                        <span className="chat-name" style={{ color: avatarColor(m.user_id) }}>
                          {m.display_name}
                        </span>
                        {hasTags && <TagPills tags={m.tags} />}
                        <span className="chat-time">{timeLabel(m.created_at)}</span>
                      </div>
                    )}
                    <div className="chat-text">{m.content}</div>
                  </div>
                </div>
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
            <div className="ib-popover-title">누구에게 말을 걸까요? AI가 첫 질문을 만들어드려요</div>
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
                  onClick={() => onPickIbTarget(m.user_id)}
                >
                  <span className="chat-avatar" style={{ background: avatarColor(m.user_id) }}>
                    {m.display_name.charAt(0)}
                  </span>
                  <span className="ib-target-name">{m.display_name}</span>
                  <TagPills tags={m.tags} common={m.common_with_me} />
                </button>
              ))
            )}
          </motion.div>
        )}
        </AnimatePresence>
        <button
          type="button"
          className={`icon-btn${ibOpen ? ' active' : ''}`}
          onClick={toggleIbPicker}
          disabled={ibBusy}
          title="AI 아이스브레이커"
        >
          <SparkIcon />
        </button>
        <input
          ref={inputRef}
          className="input"
          placeholder={channelName ? `#${channelName} 에 메시지 보내기` : '메시지 입력…'}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          maxLength={1000}
        />
        <button className="btn" type="submit" disabled={sending}>
          전송
        </button>
      </form>
    </>
  )
}

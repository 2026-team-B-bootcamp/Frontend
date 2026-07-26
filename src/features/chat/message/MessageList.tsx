/**
 * 채팅 로그 전체를 그리는 목록 — 날짜 구분선, Slack식 연속 메시지 그룹핑,
 * 무한 스크롤 센티널/빈 상태, 그리고 메시지 종류별(게임/환영/일반) 분기를 담당한다.
 */
import type { RefObject } from 'react'
import { motion } from 'motion/react'
import type { Message } from '../api'
import { GameCard } from './GameCard'
import { WelcomeCard } from './WelcomeCard'
import { MessageRow } from './MessageRow'
import { dayKey, dayLabel } from './format'

// 같은 사람이 5분 안에 연달아 보낸 메시지는 Slack처럼 헤더 없이 묶어서 표시
const GROUP_WINDOW_MS = 5 * 60 * 1000

export function MessageList({
  messages,
  initialIds,
  firstLoadDone,
  userId,
  channelName,
  serverId,
  channelId,
  hasMore,
  loadingOlder,
  logRef,
  topRef,
  bottomRef,
  onRequestDelete,
}: {
  messages: Message[]
  initialIds: Set<number> | null
  firstLoadDone: boolean
  userId: number | null
  channelName?: string
  serverId: number
  channelId: number
  hasMore: boolean
  loadingOlder: boolean
  logRef: RefObject<HTMLDivElement | null>
  topRef: RefObject<HTMLDivElement | null>
  bottomRef: RefObject<HTMLDivElement | null>
  onRequestDelete: (message: Message) => void
}) {
  return (
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
              {/* 게임이 새로 열렸다는 알림 — 채팅만 보던 사람도 바로 들어갈 수 있게
                  입장 버튼을 함께 둔다. content에는 게임 키만 들어있다. */}
              {m.kind === 'game' ? (
                <GameCard message={m} serverId={serverId} channelId={channelId} />
              ) : m.kind === 'welcome' ? (
                <WelcomeCard message={m} />
              ) : (
                <MessageRow
                  message={m}
                  grouped={grouped}
                  mine={mine}
                  onRequestDelete={onRequestDelete}
                />
              )}
            </motion.div>
          )
        })
      )}
      <div ref={bottomRef} />
    </div>
  )
}

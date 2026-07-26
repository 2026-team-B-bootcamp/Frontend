/**
 * 실제 채팅 로그를 그리고 메시지를 보내는 컴포넌트 — 이 화면의 핵심.
 * 메시지 전송/조회는 chat/api.ts(sendMessage, listMessages)가 백엔드로 요청을 보내고,
 * 남이 보낸 메시지는 ChatPage에서 내려준 subscribe(useChannelSocket)로 실시간 수신한다.
 * 그 외에 관심사 태그가 겹치는 멤버에게 AI 아이스브레이커 질문을 붙여넣는 기능도 여기에 있다.
 *
 * 이 파일은 조립부다 — 실제 로직은 useMessageFeed(메시지 로드/무한스크롤/실시간 반영),
 * useComposer(입력창 서식/타자기 효과), useIcebreaker(AI 질문 3단계), message/*(목록 렌더),
 * ChatComposer(입력 UI), DeleteMessageDialog(삭제 확인)에 나뉘어 있다.
 * error 상태 하나만은 로드/전송/삭제/아이스브레이커 네 도메인이 함께 쓴다 —
 * 각자 갖게 하면 표시 우선순위가 바뀌어 동작이 달라지므로 여기서 하나로 유지한다.
 */
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../auth/authContext'
import { sendMessage, type Message } from './api'
import { ApiError } from '../../shared/api/client'
import type { Subscribe, Typer } from '../../shared/realtime/useChannelSocket'
import { useMessageFeed } from './useMessageFeed'
import { useComposer } from './useComposer'
import { useIcebreaker } from './icebreaker/useIcebreaker'
import { IcebreakerPopover } from './icebreaker/IcebreakerPopover'
import { MessageList } from './message/MessageList'
import { ChatComposer } from './ChatComposer'
import { DeleteMessageDialog, type DeleteMessageDialogHandle } from './DeleteMessageDialog'

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
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const lastTypingRef = useRef(0)
  const deleteDialogRef = useRef<DeleteMessageDialogHandle>(null)

  const feed = useMessageFeed({ channelId, subscribe, userId, setError })
  const composer = useComposer()
  const icebreaker = useIcebreaker({
    serverId,
    userId,
    setError,
    // 입력창↔아이스브레이커의 유일한 접점 — 고른 질문을 입력창에 타자기처럼 채워넣는다
    onQuestionPicked: (question) => {
      composer.inputRef.current?.focus()
      composer.typeIntoDraft(question)
    },
  })

  // 메시지 전송: sendMessage api가 백엔드에 POST하고, 응답으로 받은 메시지를 바로 merge해서
  // 내 화면에 즉시 반영한다 (다른 사람에게는 실시간 이벤트로 전달됨)
  async function doSend(content: string) {
    const trimmed = content.trim()
    if (!trimmed || sending) return
    setSending(true)
    setError(null)
    try {
      const msg = await sendMessage(channelId, trimmed)
      feed.merge([msg])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '전송에 실패했습니다')
      throw err
    } finally {
      setSending(false)
    }
  }

  function onDraftChange(value: string) {
    composer.setDraft(value)
    const now = Date.now()
    if (value && now - lastTypingRef.current > 1500) {
      lastTypingRef.current = now
      sendTyping()
    }
  }

  function onRequestDelete(message: Message) {
    deleteDialogRef.current?.request(message)
  }

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

      <MessageList
        messages={feed.messages}
        initialIds={feed.initialIds}
        firstLoadDone={feed.firstLoadDone}
        userId={userId}
        channelName={channelName}
        serverId={serverId}
        channelId={channelId}
        hasMore={feed.hasMore}
        loadingOlder={feed.loadingOlder}
        logRef={feed.logRef}
        topRef={feed.topRef}
        bottomRef={feed.bottomRef}
        onRequestDelete={onRequestDelete}
      />

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

      <ChatComposer
        channelName={channelName}
        sending={sending}
        sendContent={doSend}
        draft={composer.draft}
        setDraft={composer.setDraft}
        inputRef={composer.inputRef}
        backdropRef={composer.backdropRef}
        onScroll={composer.onScroll}
        wrapSelection={composer.wrapSelection}
        insertAtCaret={composer.insertAtCaret}
        resetHeight={composer.resetHeight}
        onDraftChange={onDraftChange}
        ibOpen={icebreaker.ibOpen}
        ibBusy={icebreaker.ibBusy}
        toggleIbPicker={icebreaker.toggleIbPicker}
        icebreaker={
          <IcebreakerPopover
            ibOpen={icebreaker.ibOpen}
            ibMembers={icebreaker.ibMembers}
            ibBusy={icebreaker.ibBusy}
            ibTarget={icebreaker.ibTarget}
            ibSelTags={icebreaker.ibSelTags}
            ibQuestions={icebreaker.ibQuestions}
            ibTargets={icebreaker.ibTargets}
            ibTargetTags={icebreaker.ibTargetTags}
            onPickIbTarget={icebreaker.onPickIbTarget}
            toggleIbTag={icebreaker.toggleIbTag}
            generateIbQuestions={icebreaker.generateIbQuestions}
            onPickIbQuestion={icebreaker.onPickIbQuestion}
            backToMembers={icebreaker.backToMembers}
            backToTags={icebreaker.backToTags}
          />
        }
      />

      {/* 메시지 삭제 확인 모달 — 지운 메시지는 복구할 수 없어서 무엇을 지우는지 보여주고 한 번 더 묻는다 */}
      <DeleteMessageDialog
        ref={deleteDialogRef}
        channelId={channelId}
        messages={feed.messages}
        setMessages={feed.setMessages}
        setError={setError}
      />
    </>
  )
}

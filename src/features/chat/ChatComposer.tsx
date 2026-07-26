/**
 * 메시지 입력 영역 전체 — 서식 툴바, 이모지/GIF 피커, 대기 중인 GIF 첨부, 그리고 전송까지.
 * AI 아이스브레이커 팝오버(icebreaker prop)는 상태를 모르는 채로 여기서 자리만 잡아준다 —
 * .ib-popover가 이 <form>(position: relative)을 기준으로 절대 위치하기 때문이다.
 */
import { useState, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { highlightRichText } from './richText'
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
} from '../../shared/ui/icons'

export function ChatComposer({
  channelName,
  sending,
  sendContent,
  draft,
  setDraft,
  inputRef,
  backdropRef,
  onScroll,
  wrapSelection,
  insertAtCaret,
  resetHeight,
  onDraftChange,
  ibOpen,
  ibBusy,
  toggleIbPicker,
  icebreaker,
}: {
  channelName?: string
  sending: boolean
  sendContent: (content: string) => Promise<void>
  draft: string
  setDraft: (value: string) => void
  inputRef: RefObject<HTMLTextAreaElement | null>
  backdropRef: RefObject<HTMLDivElement | null>
  onScroll: () => void
  wrapSelection: (before: string, after: string) => void
  insertAtCaret: (text: string) => void
  resetHeight: () => void
  onDraftChange: (value: string) => void
  ibOpen: boolean
  ibBusy: boolean
  toggleIbPicker: () => void
  icebreaker: ReactNode
}) {
  // 입력창 위 이모지/GIF 팝오버 — 한 번에 하나만 연다
  const [picker, setPicker] = useState<'emoji' | 'gif' | null>(null)
  // 고른 GIF는 바로 보내지 않고 입력창 위에 썸네일로 대기시켰다가 전송한다
  const [pendingGif, setPendingGif] = useState<string | null>(null)

  async function submit() {
    const text = draft.trim()
    if (!text && !pendingGif) return
    try {
      // 텍스트 먼저, 그다음 GIF를 각각 한 메시지로 보낸다(렌더러는 GIF URL 단독일 때만 이미지로 임베드)
      if (text) await sendContent(text)
      if (pendingGif) {
        await sendContent(pendingGif)
        setPendingGif(null)
      }
      setDraft('')
      resetHeight()
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

  // GIF는 바로 보내지 않고 입력창 위에 썸네일로 대기시킨다 — 사용자가 확인 후 전송(또는 X로 취소).
  function onPickGif(url: string) {
    setPicker(null)
    setPendingGif(url)
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={onSend} className="chat-input">
      {icebreaker}

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
            onScroll={onScroll}
            maxLength={1000}
          />
        </div>
        <button className="btn" type="submit" disabled={sending}>
          전송
        </button>
      </div>
    </form>
  )
}

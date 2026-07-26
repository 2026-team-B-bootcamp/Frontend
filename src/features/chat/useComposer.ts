/**
 * 채팅 입력창의 서식·상태를 다루는 훅 — draft 텍스트, textarea/백드롭 참조,
 * 높이 자동조절, 서식 마커 삽입, 그리고 AI 질문을 타자기처럼 채워넣는 typeIntoDraft까지.
 * ChatComposer(입력 UI)와 icebreaker(질문 채워넣기)가 공유하는 단일 진실 공급원이라
 * ChatRoom에서 한 번만 생성해 아래로 내려준다.
 */
import { useEffect, useRef, useState } from 'react'

export function useComposer() {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  // 입력창 뒤에 서식을 그리는 백드롭 — textarea 스크롤과 동기화한다
  const backdropRef = useRef<HTMLDivElement | null>(null)

  function resetHeight() {
    const el = inputRef.current
    if (el) el.style.height = 'auto'
  }

  // textarea가 스크롤되면 뒤 백드롭도 같은 위치로 맞춘다
  function onScroll() {
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

  return {
    draft,
    setDraft,
    inputRef,
    backdropRef,
    resetHeight,
    onScroll,
    wrapSelection,
    insertAtCaret,
    typeIntoDraft,
  }
}

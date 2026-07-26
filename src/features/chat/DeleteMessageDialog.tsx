/**
 * 메시지 삭제 확인 모달. 지운 메시지는 복구할 수 없어서 무엇을 지우는지 보여주고 한 번 더 묻는다.
 *
 * shared/ui/ConfirmDialog로 통합하지 않는다 — ConfirmDialog는 .del-actions를 <form>으로
 * 감싸는데 .del-actions에 margin-top:16px(ui.css:139-144)가 걸려 있어 마진 상쇄 경로가
 * 바뀐다. Esc도 window 리스너(여기) vs 모달 onKeyDown(ConfirmDialog)으로 의미가 다르고,
 * 확인 버튼이 type="submit"이 된다. 그래서 이 컴포넌트로만 따로 둔다.
 *
 * 트래시 버튼을 누르는 쪽(메시지 목록)과 실제로 지우는 쪽(여기)이 멀리 떨어져 있어서
 * ref의 request(message)로 열도록 했다 — pendingDelete 상태와 낙관적 삭제/롤백을
 * 이 컴포넌트 안에 온전히 캡슐화하기 위해서다.
 */
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { deleteMessage, type Message } from './api'
import { ApiError } from '../../shared/api/client'

export interface DeleteMessageDialogHandle {
  request: (message: Message) => void
}

export const DeleteMessageDialog = forwardRef<
  DeleteMessageDialogHandle,
  {
    channelId: number
    messages: Message[]
    setMessages: Dispatch<SetStateAction<Message[]>>
    setError: (message: string) => void
  }
>(function DeleteMessageDialog({ channelId, messages, setMessages, setError }, ref) {
  // 삭제 확인 모달에 걸려 있는 메시지 — 되돌릴 수 없는 동작이라 한 번 더 묻는다
  const [pendingDelete, setPendingDelete] = useState<Message | null>(null)

  useImperativeHandle(ref, () => ({
    request: (message: Message) => setPendingDelete(message),
  }))

  // 삭제 확인 모달은 Esc로도 닫힌다 — 실수로 열었을 때 손이 마우스로 갈 필요가 없게
  useEffect(() => {
    if (!pendingDelete) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingDelete(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingDelete])

  // 확인 모달에서 "삭제"를 누른 뒤 실제로 지운다. 낙관적으로 먼저 화면에서 빼고,
  // 실패하면 되돌린다 — 지우기는 즉시 반응해야 자연스럽고, 실패는 드물다.
  async function onConfirmDelete() {
    const target = pendingDelete
    if (!target) return
    setPendingDelete(null)
    const snapshot = messages
    setMessages((prev) => prev.filter((m) => m.id !== target.id))
    try {
      await deleteMessage(channelId, target.id)
    } catch (err) {
      setMessages(snapshot)
      setError(err instanceof ApiError ? err.message : '메시지를 지우지 못했습니다')
    }
  }

  return (
    <AnimatePresence>
      {pendingDelete && (
        <motion.div
          className="modal-overlay"
          onClick={() => setPendingDelete(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <h2>메시지를 삭제할까요?</h2>
            <p className="muted" style={{ marginBottom: 14 }}>
              삭제한 메시지는 되돌릴 수 없어요.
            </p>
            {/* 지울 내용을 그대로 보여줘 "다른 메시지를 지우는 실수"를 막는다 */}
            <div className="del-preview">{pendingDelete.content}</div>
            <div className="del-actions">
              {/* 파괴적 동작이라 기본 포커스는 안전한 쪽(취소)에 둔다 —
                  모달이 뜨자마자 Enter를 눌러 지워버리는 사고를 막는다 */}
              <button
                type="button"
                className="btn secondary"
                onClick={() => setPendingDelete(null)}
                autoFocus
              >
                취소
              </button>
              <button type="button" className="btn danger" onClick={onConfirmDelete}>
                삭제
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

/**
 * 되돌릴 수 없는 동작을 한 번 더 묻는 확인 모달.
 *
 * window.confirm을 쓰지 않는 이유: 브라우저 기본 대화상자는 위험한 쪽과 안전한 쪽이
 * 똑같이 생겨서 무엇을 지우는지도, 어느 버튼이 파괴적인지도 알려주지 못한다.
 * 여기서는 대상 이름을 그대로 보여주고 삭제 버튼만 붉게 칠한다.
 *
 * confirmText를 주면 그 글자를 직접 입력해야 버튼이 열린다 — 모임 삭제처럼
 * 피해 범위가 큰 동작에만 쓴다. 채널 삭제 같은 것까지 타이핑을 시키면
 * 사람은 곧 글자를 기계적으로 베끼게 되고 안전장치가 아니라 절차가 된다.
 */
import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export function ConfirmDialog({
  open,
  title,
  description,
  target,
  confirmText,
  confirmLabel = '삭제',
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  /** 무엇에 대한 동작인지 — "다른 걸 지우는 실수"를 막으려고 그대로 보여준다 */
  target?: string
  /** 주어지면 이 글자를 그대로 입력해야 확정 버튼이 열린다 */
  confirmText?: string
  confirmLabel?: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const [typed, setTyped] = useState('')
  const ready = !confirmText || typed.trim() === confirmText

  function close() {
    setTyped('')
    onCancel()
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!ready || busy) return
    // 이 컴포넌트는 open이 false여도 부모에 계속 붙어 있어 상태가 살아남는다.
    // 여기서 비워두지 않으면 다음에 열었을 때 지난번에 친 이름이 그대로 남아
    // 확정 버튼이 처음부터 열려 있게 된다.
    setTyped('')
    onConfirm()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          onClick={close}
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
            onKeyDown={(e) => {
              if (e.key === 'Escape') close()
            }}
          >
            <h2>{title}</h2>
            <p className="muted" style={{ marginBottom: 14 }}>
              {description}
            </p>
            {target && <div className="del-preview">{target}</div>}

            <form onSubmit={submit}>
              {confirmText && (
                <label className="confirm-type">
                  <span className="muted">
                    확인을 위해 <b>{confirmText}</b> 을(를) 입력해 주세요
                  </span>
                  <input
                    className="input"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    aria-label="확인 문구"
                    autoComplete="off"
                    autoFocus
                  />
                </label>
              )}
              {error && <div className="error">{error}</div>}
              <div className="del-actions">
                {/* 파괴적 동작이라 기본 포커스는 안전한 쪽(취소)에 둔다 —
                    모달이 뜨자마자 Enter를 눌러 지워버리는 사고를 막는다.
                    이름을 입력받는 경우엔 입력칸이 포커스를 가져간다. */}
                <button
                  type="button"
                  className="btn secondary"
                  onClick={close}
                  autoFocus={!confirmText}
                  disabled={busy}
                >
                  취소
                </button>
                <button type="submit" className="btn danger" disabled={!ready || busy}>
                  {busy ? '처리 중…' : confirmLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

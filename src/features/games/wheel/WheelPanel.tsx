import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import {
  addWheelOption,
  getWheel,
  joinWheel,
  removeWheelOption,
  resetWheel,
  spinWheel,
  type WheelState,
} from './api'
import { ApiError } from '../../../shared/api/client'
import { fireWinConfetti } from '../../../shared/lib/confetti'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'
import { WheelDial } from './WheelDial'

function targetRotation(index: number, count: number, spins: number) {
  const seg = 360 / count
  const center = (index + 0.5) * seg
  return spins * 360 + ((360 - (center % 360)) % 360)
}

export function WheelPanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const [state, setState] = useState<WheelState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [syncedResultId, setSyncedResultId] = useState<number | null>(null)
  const [spinCount, setSpinCount] = useState(0)
  const prevResultRef = useRef<number | null>(null)

  // 결과가 새로 정해진 순간(=state.result_option_id 변화): 바늘이 멈출 위치까지 회전
  // 애니메이션을 렌더 중에 파생시킨다 (effect 없이 상태 동기화하는 패턴 — WordChainPanel과 동일)
  if (state && state.result_option_id !== syncedResultId) {
    if (state.result_option_id !== null) {
      const idx = state.options.findIndex((o) => o.id === state.result_option_id)
      if (idx >= 0) {
        setSpinning(true)
        setRotation(targetRotation(idx, state.options.length, 4 + spinCount + 1))
        setSpinCount((c) => c + 1)
      }
    } else if (state.options.length === 0) {
      setSpinning(false)
      setRotation(0)
    }
    setSyncedResultId(state.result_option_id)
  }

  const refetch = useCallback(() => {
    getWheel(channelId)
      .then((s) => setState(s))
      .catch(() => {
        // 일시적 실패는 마지막 상태 유지
      })
      .finally(() => setLoading(false))
  }, [channelId])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'wheel.state') {
          setState(e.payload as unknown as WheelState)
        } else if (e.type === 'ws.open') {
          refetch()
        }
      }),
    [subscribe, refetch],
  )

  // 결과가 새로 정해진 순간 다같이 컨페티 (회전 애니메이션이 끝나는 시점에 맞춤)
  useEffect(() => {
    const resultId = state?.result_option_id ?? null
    if (resultId !== null && prevResultRef.current === null) {
      const t = setTimeout(() => fireWinConfetti(), 3100)
      prevResultRef.current = resultId
      return () => clearTimeout(t)
    }
    prevResultRef.current = resultId
  }, [state?.result_option_id])

  async function run(fn: () => Promise<WheelState>) {
    setBusy(true)
    setError(null)
    try {
      setState(await fn())
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '요청에 실패했습니다')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function onAddOption(e: FormEvent) {
    e.preventDefault()
    const label = draft.trim()
    if (!label) return
    const ok = await run(() => addWheelOption(channelId, label))
    if (ok) setDraft('')
  }

  if (loading) return <p className="muted panel-note">불러오는 중…</p>

  if (state === null) {
    return (
      <div className="panel-empty">
        {error && <div className="error">{error}</div>}
        <p className="muted panel-note">
          아직 돌림판이 없어요. 다같이 항목을 채우고 무작위로 하나를 뽑아보세요.
        </p>
        <button className="btn" onClick={() => run(() => joinWheel(channelId))} disabled={busy}>
          게임 열기
        </button>
      </div>
    )
  }

  const hasResult = state.result_option_id !== null
  const winner = state.options.find((o) => o.id === state.result_option_id)
  const canAdd = !hasResult && state.options.length < 12

  return (
    <div className="wheel-panel">
      {error && <div className="error">{error}</div>}

      <div className="panel-scorebar">
        <span className="score">{state.options.length}개 항목</span>
      </div>

      <WheelDial options={state.options} rotation={rotation} spinning={spinning} />

      {hasResult && winner && (
        <motion.div
          className="banner win"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: 3.0 }}
        >
          &quot;{winner.label}&quot; 당첨! ({state.spun_by}님이 돌림)
        </motion.div>
      )}

      {canAdd && (
        <form className="wheel-input" onSubmit={onAddOption}>
          <input
            className="input"
            placeholder="항목 추가 (예: 짜장면)"
            value={draft}
            maxLength={20}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn" type="submit" disabled={busy || !draft.trim()}>
            추가
          </button>
        </form>
      )}

      {!hasResult && state.options.length > 0 && (
        <ul className="wheel-options">
          {state.options.map((o) => (
            <li key={o.id} className="wheel-option-row">
              <span>{o.label}</span>
              <span className="wheel-option-meta">
                {o.added_by}
                <button
                  type="button"
                  className="wheel-option-remove"
                  aria-label={`${o.label} 삭제`}
                  onClick={() => run(() => removeWheelOption(channelId, o.id))}
                  disabled={busy}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="wheel-actions">
        {!hasResult ? (
          <button
            className="btn"
            onClick={() => run(() => spinWheel(channelId))}
            disabled={busy || state.options.length < 2}
          >
            {busy ? '돌리는 중…' : '돌리기'}
          </button>
        ) : (
          <button className="btn" onClick={() => run(() => resetWheel(channelId))} disabled={busy}>
            새로 돌리기
          </button>
        )}
      </div>
      {!hasResult && state.options.length < 2 && (
        <p className="muted panel-note">항목이 2개 이상이어야 돌릴 수 있어요</p>
      )}
    </div>
  )
}

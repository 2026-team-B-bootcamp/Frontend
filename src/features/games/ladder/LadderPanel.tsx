/**
 * 사다리타기 게임 패널.
 * 서버와의 통신(api.ts, 내부적으로 shared/api/client 경유)과 게임 진행 상태 관리를
 * 담당하는 컴포넌트다. 실제 사다리 그림은 LadderBoard가 그린다.
 * 흐름: 이 패널 → ladder/api.ts → 백엔드 사다리타기 라우터, 그리고 실시간 이벤트로
 * 다른 참가자의 변경 사항도 함께 반영된다.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  addParticipant,
  addResult,
  getLadder,
  joinLadder,
  removeParticipant,
  removeResult,
  resetLadder,
  runLadder,
  type LadderState,
} from './api'
import { ApiError } from '../../../shared/api/client'
import { fireWinConfetti } from '../../../shared/lib/confetti'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'
import { LadderBoard } from './LadderBoard'

function EntryList({
  title,
  entries,
  onAdd,
  onRemove,
  disabled,
  busy,
  placeholder,
}: {
  title: string
  entries: LadderState['participants']
  onAdd: (label: string) => Promise<boolean>
  onRemove: (id: number) => void
  disabled: boolean
  busy: boolean
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const label = draft.trim()
    if (!label) return
    const ok = await onAdd(label)
    if (ok) setDraft('')
  }

  return (
    <div className="ladder-entry-col">
      <div className="panel-title">{title}</div>
      <ul className="ladder-entry-list">
        {entries.map((entry) => (
          <li key={entry.id} className="ladder-entry-row">
            <span>{entry.label}</span>
            <button
              type="button"
              className="wheel-option-remove"
              aria-label={`${entry.label} 삭제`}
              onClick={() => onRemove(entry.id)}
              disabled={disabled || busy}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {!disabled && entries.length < 8 && (
        <form className="wheel-input" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder={placeholder}
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
    </div>
  )
}

export function LadderPanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const [state, setState] = useState<LadderState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const prevStatusRef = useRef<LadderState['status'] | null>(null)

  const refetch = useCallback(() => {
    getLadder(channelId)
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
      // 실시간 채널을 구독해서 서버가 보내는 사다리 상태 변화를 그대로 반영한다.
      // 대기중(waiting) → 공개(revealed)로 막 바뀐 순간에만 컨페티를 터뜨리는데,
      // 1700ms 지연은 LadderBoard의 토큰 이동 애니메이션(REVEAL_DELAY=1.7초)이
      // 끝나는 시점에 맞춘 것이다.
      subscribe((e) => {
        if (e.type === 'ladder.state') {
          const next = e.payload as unknown as LadderState
          setState(next)
          if (prevStatusRef.current === 'waiting' && next.status === 'revealed') {
            setTimeout(() => fireWinConfetti(), 1700)
          }
          prevStatusRef.current = next.status
        } else if (e.type === 'ws.open') {
          refetch()
        }
      }),
    [subscribe, refetch],
  )

  // 참가자 추가/삭제, 사다리 타기 등 서버에 변경을 요청하는 모든 액션의 공통 래퍼.
  // busy로 중복 요청을 막고, 실패 시 에러 메시지를 보여준다.
  async function run(fn: () => Promise<LadderState>) {
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

  if (loading) return <p className="muted panel-note">불러오는 중…</p>

  if (state === null) {
    return (
      <div className="panel-empty">
        {error && <div className="error">{error}</div>}
        <p className="muted panel-note">
          아직 사다리가 없어요. 참가자와 결과를 채우고 사다리를 타보세요.
        </p>
        <button className="btn" onClick={() => run(() => joinLadder(channelId))} disabled={busy}>
          게임 열기
        </button>
      </div>
    )
  }

  // 결과가 공개된 상태인지 여부. 공개되면 편집 UI 대신 사다리 보드를 보여준다.
  const revealed = state.status === 'revealed'
  // 사다리를 탈 수 있는 조건: 아직 공개 전이고, 참가자/결과가 2명 이상 & 같은 개수
  const canRun =
    !revealed &&
    state.participants.length >= 2 &&
    state.participants.length === state.results.length

  return (
    <div className="ladder-panel">
      {error && <div className="error">{error}</div>}

      <div className="panel-scorebar">
        <span className="score">{state.participants.length}명</span>
      </div>

      {revealed ? (
        <>
          <LadderBoard
            participants={state.participants}
            results={state.results}
            rungs={state.rungs ?? []}
          />
          <p className="muted panel-note">{state.run_by}님이 사다리를 탔어요</p>
          <div className="wheel-actions">
            <button className="btn" onClick={() => run(() => resetLadder(channelId))} disabled={busy}>
              새로 시작
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="ladder-entries">
            <EntryList
              title="참가자"
              entries={state.participants}
              onAdd={(label) => run(() => addParticipant(channelId, label))}
              onRemove={(id) => run(() => removeParticipant(channelId, id))}
              disabled={revealed}
              busy={busy}
              placeholder="참가자 이름"
            />
            <EntryList
              title="결과"
              entries={state.results}
              onAdd={(label) => run(() => addResult(channelId, label))}
              onRemove={(id) => run(() => removeResult(channelId, id))}
              disabled={revealed}
              busy={busy}
              placeholder="결과 (예: 커피쏘기)"
            />
          </div>
          <div className="wheel-actions">
            <button
              className="btn"
              onClick={() => run(() => runLadder(channelId))}
              disabled={busy || !canRun}
            >
              {busy ? '타는 중…' : '사다리 타기'}
            </button>
          </div>
          {!canRun && (
            <p className="muted panel-note">
              참가자와 결과가 2개 이상, 같은 개수여야 시작할 수 있어요
            </p>
          )}
        </>
      )}
    </div>
  )
}

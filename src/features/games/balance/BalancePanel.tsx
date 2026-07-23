/**
 * 밸런스게임 패널 — A/B 주제를 게시글처럼 띄우고 제한시간(5분) 동안 투표 + 의견 토론을 진행한다.
 * 흐름: BalancePanel → balance/api.ts → 백엔드 balance 라우터. 다수 참여형.
 * 브로드캐스트(balance.state)엔 개인 투표가 없으므로, 내 투표(my_vote)는 로컬에서 유지한다.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../../auth/authContext'
import {
  commentBalance,
  getBalance,
  resetBalance,
  startBalance,
  voteBalance,
  type BalanceState,
  type Side,
} from './api'
import { ApiError } from '../../../shared/api/client'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'

function mmss(totalSec: number) {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function BalancePanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const { userId } = useAuth()
  const [state, setState] = useState<BalanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [optA, setOptA] = useState('')
  const [optB, setOptB] = useState('')
  const [comment, setComment] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const finishSyncedRef = useRef(false)

  const refetch = useCallback(() => {
    getBalance(channelId)
      .then((s) => setState(s))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [channelId])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'balance.state') {
          const p = e.payload as unknown as BalanceState
          // 브로드캐스트엔 my_vote가 없으니 내 값은 유지한다
          setState((prev) => ({ ...p, my_vote: p.my_vote ?? prev?.my_vote ?? null }))
          finishSyncedRef.current = false
        } else if (e.type === 'ws.open') {
          refetch()
        }
      }),
    [subscribe, refetch],
  )

  const active = Boolean(state?.active)
  const endsAt = state?.ends_at ?? null
  const remainingSec = endsAt ? Math.max(0, Math.round(endsAt - now / 1000)) : 0
  const finished = Boolean(state?.finished) || (active && endsAt !== null && remainingSec <= 0)

  // 진행 중일 때만 1초마다 카운트다운 갱신
  useEffect(() => {
    if (!active || finished) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active, finished])

  // 로컬 타이머가 0이 됐는데 서버는 아직 finished가 아니면 한 번 동기화(잠금 해제 트리거)
  useEffect(() => {
    if (active && !state?.finished && finished && !finishSyncedRef.current) {
      finishSyncedRef.current = true
      refetch()
    }
  }, [active, finished, state?.finished, refetch])

  async function run(fn: () => Promise<BalanceState>) {
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

  async function onStart(e: FormEvent) {
    e.preventDefault()
    if (!optA.trim() || !optB.trim()) return
    const ok = await run(() => startBalance(channelId, optA.trim(), optB.trim()))
    if (ok) {
      setOptA('')
      setOptB('')
    }
  }

  async function onComment(e: FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    const ok = await run(() => commentBalance(channelId, comment.trim()))
    if (ok) setComment('')
  }

  if (loading) return <p className="muted panel-note">불러오는 중…</p>

  // 시작 화면 — 두 선택지를 입력해 게시한다
  if (!active || !state) {
    return (
      <form className="bal-start" onSubmit={onStart}>
        {error && <div className="error">{error}</div>}
        <p className="muted panel-note">두 선택지를 올리면 5분간 투표·토론이 열려요</p>
        <input
          className="input"
          placeholder="선택지 A (예: 부먹)"
          value={optA}
          maxLength={40}
          onChange={(e) => setOptA(e.target.value)}
        />
        <span className="bal-vs">VS</span>
        <input
          className="input"
          placeholder="선택지 B (예: 찍먹)"
          value={optB}
          maxLength={40}
          onChange={(e) => setOptB(e.target.value)}
        />
        <button className="btn" type="submit" disabled={busy || !optA.trim() || !optB.trim()}>
          {busy ? '여는 중…' : '밸런스 열기'}
        </button>
      </form>
    )
  }

  const total = state.count_a + state.count_b
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const winner: Side | null = finished
    ? state.count_a === state.count_b
      ? null
      : state.count_a > state.count_b
        ? 'a'
        : 'b'
    : null

  function optionButton(side: Side, label: string, count: number) {
    const cls = ['bal-option', side]
    if (state!.my_vote === side) cls.push('mine')
    if (winner === side) cls.push('win')
    return (
      <button
        className={cls.join(' ')}
        disabled={busy || finished}
        onClick={() => run(() => voteBalance(channelId, side))}
      >
        <span className="bal-option-bar" style={{ width: `${pct(count)}%` }} />
        <span className="bal-option-label">{label}</span>
        <span className="bal-option-count">
          {count}표 · {pct(count)}%
        </span>
      </button>
    )
  }

  return (
    <div className="balance-panel">
      {error && <div className="error">{error}</div>}

      <div className="bal-head">
        <span className="bal-title">밸런스게임</span>
        <span className={`bal-timer${finished ? ' done' : remainingSec <= 30 ? ' danger' : ''}`}>
          {finished ? '마감' : mmss(remainingSec)}
        </span>
      </div>

      <div className="bal-options">
        {optionButton('a', state.option_a ?? 'A', state.count_a)}
        {optionButton('b', state.option_b ?? 'B', state.count_b)}
      </div>

      {finished && (
        <motion.div
          className="bal-result"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          {winner === null
            ? '무승부! 팽팽했어요'
            : `"${winner === 'a' ? state.option_a : state.option_b}" 승리 🎉`}
        </motion.div>
      )}

      <div className="bal-comments">
        {state.comments.length === 0 ? (
          <p className="muted bal-comments-empty">아직 의견이 없어요 — 먼저 남겨보세요</p>
        ) : (
          state.comments.map((c, i) => (
            <div key={i} className={`bal-comment${c.user_id === userId ? ' mine' : ''}`}>
              {c.side && <span className={`bal-comment-side ${c.side}`}>{c.side === 'a' ? 'A' : 'B'}</span>}
              <span className="bal-comment-name">{c.display_name}</span>
              <span className="bal-comment-text">{c.text}</span>
            </div>
          ))
        )}
      </div>

      {!finished ? (
        <form className="bal-comment-form" onSubmit={onComment}>
          <input
            className="input"
            placeholder="의견 남기기…"
            value={comment}
            maxLength={200}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn" type="submit" disabled={busy || !comment.trim()}>
            등록
          </button>
        </form>
      ) : (
        <button
          className="btn"
          style={{ marginTop: 4 }}
          onClick={() => run(() => resetBalance(channelId))}
          disabled={busy}
        >
          새 밸런스 만들기
        </button>
      )}
    </div>
  )
}

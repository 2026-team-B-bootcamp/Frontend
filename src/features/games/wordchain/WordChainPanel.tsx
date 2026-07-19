/**
 * 끝말잇기 게임 패널.
 * 서버와의 통신(api.ts, 내부적으로 shared/api/client 경유)과 턴 진행(제한시간 타이머,
 * 단어 제출) 관리를 담당한다. 단어가 규칙에 맞는지(첫 글자 일치, 중복 여부 등)의
 * 검증은 서버가 판정하며, 이 컴포넌트는 그 결과만 받아 화면에 반영한다.
 * 흐름: 이 패널 → wordchain/api.ts → 백엔드 끝말잇기 라우터.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../../auth/authContext'
import {
  getWordChain,
  joinWordChain,
  startWordChain,
  submitWord,
  type WordChainState,
} from './api'
import { ApiError } from '../../../shared/api/client'
import { fireWinConfetti } from '../../../shared/lib/confetti'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'

const TURN_TOTAL = 30

// 내 차례에 남은 시간을 원형 게이지로 보여준다. 10초 이하면 danger 스타일로 강조.
function TimerRing({ seconds }: { seconds: number }) {
  const r = 15
  const c = 2 * Math.PI * r
  const ratio = Math.max(0, Math.min(1, seconds / TURN_TOTAL))
  const danger = seconds <= 10
  return (
    <span className={`wc-timer${danger ? ' danger' : ''}`}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          transform="rotate(-90 20 20)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="wc-timer-num">{seconds}</span>
    </span>
  )
}

export function WordChainPanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const { userId } = useAuth()
  const [state, setState] = useState<WordChainState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [seconds, setSeconds] = useState<number | null>(null)
  const prevStatusRef = useRef<string | null>(null)
  const chainEndRef = useRef<HTMLDivElement | null>(null)

  // 서버 상태가 갱신될 때마다 로컬 카운트다운을 서버 기준으로 다시 맞춘다
  // (렌더 중 상태 보정 패턴 — effect 없이 파생 상태를 동기화)
  const [syncedState, setSyncedState] = useState<WordChainState | null>(null)
  if (state !== syncedState) {
    setSyncedState(state)
    setSeconds(state?.seconds_left ?? null)
  }

  const refetch = useCallback(() => {
    getWordChain(channelId)
      .then((s) => setState(s))
      .catch(() => {
        // 일시적 실패는 마지막 상태 유지
      })
      .finally(() => setLoading(false))
  }, [channelId])

  useEffect(() => {
    refetch()
  }, [refetch])

  // WS로 전체 상태가 그대로 내려오고, 재연결 시엔 다시 가져온다
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'wordchain.state') {
          setState(e.payload as unknown as WordChainState)
        } else if (e.type === 'ws.open') {
          refetch()
        }
      }),
    [subscribe, refetch],
  )

  // 로컬 카운트다운: 매초 1씩 줄이다가 0이 되면 refetch로 서버에 최신 판정을 요청한다
  // (시간 초과로 인한 탈락 처리는 서버가 담당하고, 여기선 화면 표시용 시계만 돈다)
  useEffect(() => {
    if (state?.status !== 'playing' || seconds === null) return
    if (seconds <= 0) {
      refetch()
      return
    }
    const t = setTimeout(() => setSeconds((s) => (s !== null ? s - 1 : s)), 1000)
    return () => clearTimeout(t)
  }, [seconds, state?.status, refetch])

  // 게임 상태가 playing → finished로 바뀐 순간, 승자가 나(userId)라면 컨페티를 터뜨린다
  useEffect(() => {
    if (
      state?.status === 'finished' &&
      prevStatusRef.current === 'playing' &&
      state.winner_user_id === userId
    ) {
      fireWinConfetti()
    }
    prevStatusRef.current = state?.status ?? null
  }, [state, userId])

  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state?.words.length])

  // 참여/시작/단어 제출 등 서버에 변경을 요청하는 모든 액션의 공통 래퍼.
  // busy로 중복 요청을 막고, 실패 시(예: 규칙에 맞지 않는 단어) 에러 메시지를 보여준다.
  async function run(fn: () => Promise<WordChainState>) {
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

  // 입력창의 단어를 서버로 제출한다. 유효성 검사(끝말잇기 규칙 위반 등)는 서버가
  // 판정하고, 성공한 경우에만 입력창을 비운다.
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const word = draft.trim()
    if (!word) return
    const ok = await run(() => submitWord(channelId, word))
    if (ok) setDraft('')
  }

  if (loading) return <p className="muted panel-note">불러오는 중…</p>

  if (state === null) {
    return (
      <div className="panel-empty">
        {error && <div className="error">{error}</div>}
        <p className="muted panel-note">
          아직 게임이 없어요. 끝말잇기로 아이스브레이킹 해보세요. 30초 안에 단어를 잇지
          못하면 탈락!
        </p>
        <button className="btn" onClick={() => run(() => joinWordChain(channelId))} disabled={busy}>
          게임 열기
        </button>
      </div>
    )
  }

  const me = state.players.find((p) => p.user_id === userId)
  const myTurn = state.turn_user_id === userId
  const turnPlayer = state.players.find((p) => p.user_id === state.turn_user_id)
  const lastWord = state.words.at(-1)
  // 다음 단어가 시작해야 할 글자(화면 힌트용). 실제 두음법칙 등 검증은 서버가 한다.
  const nextChar = lastWord ? lastWord.word.at(-1) : null

  return (
    <div className="wc-panel">
      {error && <div className="error">{error}</div>}

      <div className="panel-scorebar">
        {state.players.map((p) => (
          <span
            key={p.user_id}
            className={`score${p.alive ? '' : ' dead'}${
              state.status === 'playing' && p.user_id === state.turn_user_id ? ' turn' : ''
            }`}
          >
            {p.display_name}
            {p.user_id === userId && ' (나)'}
          </span>
        ))}
      </div>

      {state.last_event && <div className="wc-event">{state.last_event}</div>}

      {state.status === 'waiting' && (
        <div className="panel-empty">
          <p className="muted panel-note">
            {state.players.length}명 대기 중 — 2명 이상 모이면 시작할 수 있어요
          </p>
          {me === undefined ? (
            <button
              className="btn"
              onClick={() => run(() => joinWordChain(channelId))}
              disabled={busy}
            >
              참여하기
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => run(() => startWordChain(channelId))}
              disabled={busy || state.players.length < 2}
            >
              시작하기
            </button>
          )}
        </div>
      )}

      {state.status === 'playing' && (
        <>
          <div className="wc-turnbar">
            {seconds !== null && <TimerRing seconds={seconds} />}
            <div className="wc-turn-info">
              <div className="wc-turn-name">
                {myTurn ? '내 차례예요!' : `${turnPlayer?.display_name ?? '?'}님 차례`}
              </div>
              {nextChar && (
                <div className="muted" style={{ fontSize: 12 }}>
                  <b className="wc-next-char">{nextChar}</b>(으)로 시작 · 두음법칙 인정
                </div>
              )}
            </div>
          </div>

          <div className="wc-chain">
            {state.words.length === 0 ? (
              <p className="muted panel-note">첫 단어는 자유! 아무 단어나 시작하세요.</p>
            ) : (
              <AnimatePresence initial={false}>
                {state.words.map((w, i) => (
                  <motion.span
                    key={`${i}-${w.word}`}
                    className={`wc-chip${w.user_id === userId ? ' mine' : ''}`}
                    initial={{ opacity: 0, scale: 0.7, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                  >
                    <span className="wc-chip-word">{w.word}</span>
                    <span className="wc-chip-author">{w.display_name}</span>
                  </motion.span>
                ))}
              </AnimatePresence>
            )}
            <div ref={chainEndRef} />
          </div>

          {me?.alive === false ? (
            <p className="muted panel-note">탈락했어요. 다음 라운드를 기다려주세요.</p>
          ) : (
            <form className="wc-input" onSubmit={onSubmit}>
              <input
                className="input"
                placeholder={myTurn ? '단어 입력…' : '내 차례를 기다리는 중…'}
                value={draft}
                maxLength={10}
                disabled={!myTurn || busy}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button className="btn" type="submit" disabled={!myTurn || busy}>
                제출
              </button>
            </form>
          )}
        </>
      )}

      {state.status === 'finished' && (
        <div className="panel-empty">
          <motion.div
            className={`banner ${state.winner_user_id === userId ? 'win' : 'lose'}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {state.winner_user_id === userId
              ? '끝까지 살아남았어요! 승리 🎉'
              : `${
                  state.players.find((p) => p.user_id === state.winner_user_id)?.display_name ??
                  '상대'
                }님의 승리!`}
          </motion.div>
          {state.words.length > 0 && (
            <p className="muted panel-note">
              이번 판 단어 {state.words.length}개 — 마지막 단어 "{lastWord?.word}"
            </p>
          )}
          <button
            className="btn"
            onClick={() => run(() => joinWordChain(channelId))}
            disabled={busy}
          >
            새 라운드 열기
          </button>
        </div>
      )}
    </div>
  )
}

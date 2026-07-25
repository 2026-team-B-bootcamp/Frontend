/**
 * 끝말잇기(폭탄 돌리기) 게임 패널.
 * 규칙: 판 전체에 딱 하나 걸린 2분짜리 도화선이 계속 타들어가고, 시간이 다 되는 순간
 * 폭탄을 든 사람 한 명이 패배한다. 앞 단어의 끝글자로 잇는 단어를 대면 폭탄을 다음
 * 사람에게 넘길 뿐 시간은 리셋되지 않는다. 단어 규칙 검증은 서버가 판정한다.
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
import { HostEndButton } from '../HostControls'
import { useGameEnded } from '../useGameEnded'

const FUSE_TOTAL = 120

// 폭탄 도화선 — 남은 시간에 비례해 줄어드는 심지 막대 + 💣. 20초 이하면 danger. (초성퀴즈와 동일 비주얼)
function Fuse({ seconds }: { seconds: number }) {
  const ratio = Math.max(0, Math.min(1, seconds / FUSE_TOTAL))
  const danger = seconds <= 20
  const mm = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <div className={`cho-fuse${danger ? ' danger' : ''}`}>
      <span className="cho-bomb" aria-hidden>
        💣
      </span>
      <div className="cho-fuse-track">
        <div className="cho-fuse-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="cho-fuse-time">
        {mm}:{ss}
      </span>
    </div>
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

  // 방장이 판을 접으면 판 자체가 사라진다 — "게임 없음" 화면으로 되돌린다
  useGameEnded('wordchain', subscribe, () => setState(null))

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

  // 로컬 카운트다운: 매초 1씩 줄이다 0이 되면 refetch로 서버의 최신 판정을 받는다
  // (폭탄이 터지는 패배 처리는 서버 담당, 여기선 표시용 도화선만 탄다)
  useEffect(() => {
    if (state?.status !== 'playing' || seconds === null) return
    if (seconds <= 0) {
      refetch()
      return
    }
    const t = setTimeout(() => setSeconds((s) => (s !== null ? s - 1 : s)), 1000)
    return () => clearTimeout(t)
  }, [seconds, state?.status, refetch])

  // playing → finished 순간, 내가 패자가 아니라면(살아남았으면) 컨페티
  useEffect(() => {
    if (
      state?.status === 'finished' &&
      prevStatusRef.current === 'playing' &&
      state.loser_user_id !== userId &&
      state.players.some((p) => p.user_id === userId)
    ) {
      fireWinConfetti()
    }
    prevStatusRef.current = state?.status ?? null
  }, [state, userId])

  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state?.words.length])

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
          아직 게임이 없어요. 끝말잇기 폭탄 돌리기로 아이스브레이킹! 2분 도화선이 다 타기
          전에 끝말을 이어 폭탄을 넘기세요. 터질 때 든 사람이 벌칙!
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
            className={`score${
              state.status === 'finished' && p.user_id === state.loser_user_id ? ' dead' : ''
            }${state.status === 'playing' && p.user_id === state.turn_user_id ? ' turn' : ''}`}
          >
            {state.status === 'playing' && p.user_id === state.turn_user_id && '💣 '}
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
          {seconds !== null && <Fuse seconds={seconds} />}

          <div className="wc-turnbar">
            <div className="wc-turn-info">
              <div className="wc-turn-name">
                {myTurn ? '💣 내 차례! 얼른 넘기세요' : `${turnPlayer?.display_name ?? '?'}님이 폭탄 보유`}
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

          <form className="wc-input" onSubmit={onSubmit}>
            <input
              className="input"
              placeholder={myTurn ? '끝말 이을 단어…' : '내 차례를 기다리는 중…'}
              value={draft}
              maxLength={10}
              disabled={!myTurn || busy}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn" type="submit" disabled={!myTurn || busy}>
              넘기기
            </button>
          </form>
        </>
      )}

      {state.status === 'finished' && (
        <div className="panel-empty">
          <motion.div
            className={`banner ${state.loser_user_id === userId ? 'lose' : 'win'}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {state.loser_user_id === userId
              ? '💥 폭탄이 터졌어요… 벌칙 당첨!'
              : `💣 ${
                  state.players.find((p) => p.user_id === state.loser_user_id)?.display_name ??
                  '누군가'
                }님 손에서 폭탄이 터졌어요!`}
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

      <HostEndButton channelId={channelId} kind="wordchain" hostUserId={state.host_user_id} />
    </div>
  )
}

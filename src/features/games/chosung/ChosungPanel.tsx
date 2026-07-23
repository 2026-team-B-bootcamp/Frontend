/**
 * 초성퀴즈(폭탄 돌리기) 게임 패널.
 * 서버와의 통신(api.ts, 내부적으로 shared/api/client 경유)과 폭탄 도화선 카운트다운,
 * 초성 단어 제출을 담당한다. 초성이 맞는지·중복인지의 판정은 서버가 하고, 이 컴포넌트는
 * 그 결과만 받아 화면에 반영한다.
 * 규칙: 판 전체에 딱 하나 걸린 2분짜리 도화선이 계속 타들어가고, 시간이 다 되는 순간
 * 폭탄을 든 사람 한 명이 패배한다. 맞히면 폭탄을 다음 사람에게 넘길 뿐 시간은 리셋되지 않는다.
 * 흐름: 이 패널 → chosung/api.ts → 백엔드 초성퀴즈 라우터.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../../auth/authContext'
import {
  getChosung,
  joinChosung,
  startChosung,
  submitChosung,
  type ChosungState,
} from './api'
import { ApiError } from '../../../shared/api/client'
import { fireWinConfetti } from '../../../shared/lib/confetti'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'

const FUSE_TOTAL = 120

// 폭탄 도화선 — 남은 시간에 비례해 줄어드는 심지 막대 + 💣 아이콘. 20초 이하면 danger.
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

export function ChosungPanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const { userId } = useAuth()
  const [state, setState] = useState<ChosungState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [seconds, setSeconds] = useState<number | null>(null)
  const prevStatusRef = useRef<string | null>(null)

  // 서버 상태가 갱신될 때마다 로컬 카운트다운을 서버 기준으로 다시 맞춘다
  // (렌더 중 상태 보정 패턴 — effect 없이 파생 상태를 동기화)
  const [syncedState, setSyncedState] = useState<ChosungState | null>(null)
  if (state !== syncedState) {
    setSyncedState(state)
    setSeconds(state?.seconds_left ?? null)
  }

  const refetch = useCallback(() => {
    getChosung(channelId)
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
        if (e.type === 'chosung.state') {
          setState(e.payload as unknown as ChosungState)
        } else if (e.type === 'ws.open') {
          refetch()
        }
      }),
    [subscribe, refetch],
  )

  // 로컬 카운트다운: 매초 1씩 줄이다가 0이 되면 refetch로 서버에 최신 판정을 요청한다
  // (폭탄이 터지는 패배 처리는 서버가 담당하고, 여기선 화면 표시용 도화선만 탄다)
  useEffect(() => {
    if (state?.status !== 'playing' || seconds === null) return
    if (seconds <= 0) {
      refetch()
      return
    }
    const t = setTimeout(() => setSeconds((s) => (s !== null ? s - 1 : s)), 1000)
    return () => clearTimeout(t)
  }, [seconds, state?.status, refetch])

  // playing → finished로 바뀐 순간, 내가 패자가 아니라면(살아남았으면) 컨페티를 터뜨린다
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

  // 참여/시작/제출 등 서버에 변경을 요청하는 모든 액션의 공통 래퍼.
  async function run(fn: () => Promise<ChosungState>) {
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

  // 입력창의 단어를 서버로 제출한다. 초성 일치 검증은 서버가 하고, 성공한 경우에만 비운다.
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const word = draft.trim()
    if (!word) return
    const ok = await run(() => submitChosung(channelId, word))
    if (ok) setDraft('')
  }

  if (loading) return <p className="muted panel-note">불러오는 중…</p>

  if (state === null) {
    return (
      <div className="panel-empty">
        {error && <div className="error">{error}</div>}
        <p className="muted panel-note">
          아직 게임이 없어요. 초성퀴즈 폭탄 돌리기로 아이스브레이킹! 2분 도화선이 다 타기
          전에 초성에 맞는 단어를 대고 폭탄을 넘기세요. 터질 때 든 사람이 벌칙!
        </p>
        <button className="btn" onClick={() => run(() => joinChosung(channelId))} disabled={busy}>
          게임 열기
        </button>
      </div>
    )
  }

  const me = state.players.find((p) => p.user_id === userId)
  const myTurn = state.turn_user_id === userId
  const turnPlayer = state.players.find((p) => p.user_id === state.turn_user_id)

  return (
    <div className="cho-panel">
      {error && <div className="error">{error}</div>}

      <div className="panel-scorebar">
        {state.players.map((p) => (
          <span
            key={p.user_id}
            className={`score${
              state.status === 'finished' && p.user_id === state.loser_user_id ? ' dead' : ''
            }${
              state.status === 'playing' && p.user_id === state.turn_user_id ? ' turn' : ''
            }`}
          >
            {state.status === 'playing' && p.user_id === state.turn_user_id && '💣 '}
            {p.display_name}
            {p.user_id === userId && ' (나)'}
          </span>
        ))}
      </div>

      {state.last_event && <div className="cho-event">{state.last_event}</div>}

      {state.status === 'waiting' && (
        <div className="panel-empty">
          <p className="muted panel-note">
            {state.players.length}명 대기 중 — 2명 이상 모이면 시작할 수 있어요
          </p>
          {me === undefined ? (
            <button
              className="btn"
              onClick={() => run(() => joinChosung(channelId))}
              disabled={busy}
            >
              참여하기
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => run(() => startChosung(channelId))}
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

          <div className="cho-stage">
            <div className="cho-prompt">{state.prompt}</div>
            <div className="cho-holder">
              {myTurn ? (
                <b className="cho-holder-me">내 손에 폭탄이 있어요!</b>
              ) : (
                <span>
                  <b>{turnPlayer?.display_name ?? '?'}</b>님이 폭탄을 들고 있어요
                </span>
              )}
            </div>
          </div>

          {state.words.length > 0 && (
            <div className="cho-history">
              <AnimatePresence initial={false}>
                {state.words.map((w, i) => (
                  <motion.span
                    key={`${i}-${w}`}
                    className="cho-chip"
                    initial={{ opacity: 0, scale: 0.7, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                  >
                    {w}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}

          <form className="cho-input" onSubmit={onSubmit}>
            <input
              className="input"
              placeholder={
                myTurn ? `'${state.prompt}' 초성 단어…` : '내 차례를 기다리는 중…'
              }
              value={draft}
              maxLength={3}
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
            <p className="muted panel-note">이번 판 정답 {state.words.length}개</p>
          )}
          <button
            className="btn"
            onClick={() => run(() => joinChosung(channelId))}
            disabled={busy}
          >
            새 라운드 열기
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * 끝말잇기(폭탄 돌리기) 게임 패널.
 * 규칙: 판 전체에 딱 하나 걸린 2분짜리 도화선이 계속 타들어가고, 시간이 다 되는 순간
 * 폭탄을 든 사람 한 명이 패배한다. 앞 단어의 끝글자로 잇는 단어를 대면 폭탄을 다음
 * 사람에게 넘길 뿐 시간은 리셋되지 않는다. 단어 규칙 검증은 서버가 판정한다.
 * 흐름: 이 패널 → wordchain/api.ts → 백엔드 끝말잇기 라우터.
 *
 * 도화선(Fuse)·카운트다운·생존자 컨페티·점수바·종료 배너는 초성퀴즈(ChosungPanel)와
 * 거의 100% 같아서 features/games/{Fuse,useFuseCountdown,BombScorebar}로 뺐다.
 * 이 패널에 남은 건 words 칩 목록(wc-chain)처럼 끝말잇기만의 화면뿐이다.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../../auth/authContext'
import { getWordChain, joinWordChain, startWordChain, submitWord } from './api'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'
import { HostEndButton } from '../HostControls'
import { useGameSession } from '../useGameSession'
import { Fuse } from '../Fuse'
import { useFuseCountdown, useBombSurvivorConfetti } from '../useFuseCountdown'
import { BombScorebar, BombFinishedBanner } from '../BombScorebar'

export function WordChainPanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const { userId } = useAuth()
  const { state, loading, error, busy, run, refetch } = useGameSession(
    'wordchain',
    channelId,
    subscribe,
    getWordChain,
  )
  const [draft, setDraft] = useState('')
  const chainEndRef = useRef<HTMLDivElement | null>(null)

  const seconds = useFuseCountdown(state, refetch)
  useBombSurvivorConfetti(state, userId)

  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state?.words.length])

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

      <BombScorebar state={state} userId={userId} />

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
          <BombFinishedBanner state={state} userId={userId} />
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

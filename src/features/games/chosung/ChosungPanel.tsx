/**
 * 초성퀴즈(폭탄 돌리기) 게임 패널.
 * 서버와의 통신(api.ts, 내부적으로 shared/api/client 경유)과 폭탄 도화선 카운트다운,
 * 초성 단어 제출을 담당한다. 초성이 맞는지·중복인지의 판정은 서버가 하고, 이 컴포넌트는
 * 그 결과만 받아 화면에 반영한다.
 * 규칙: 판 전체에 딱 하나 걸린 2분짜리 도화선이 계속 타들어가고, 시간이 다 되는 순간
 * 폭탄을 든 사람 한 명이 패배한다. 맞히면 폭탄을 다음 사람에게 넘길 뿐 시간은 리셋되지 않는다.
 * 흐름: 이 패널 → chosung/api.ts → 백엔드 초성퀴즈 라우터.
 *
 * 도화선(Fuse)·카운트다운·생존자 컨페티·점수바·종료 배너는 끝말잇기(WordChainPanel)와
 * 거의 100% 같아서 features/games/{Fuse,useFuseCountdown,BombScorebar}로 뺐다.
 * 이 패널에 남은 건 초성 프롬프트/정답 이력(cho-stage, cho-history)처럼 초성퀴즈만의
 * 화면뿐이다.
 */
import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../../auth/authContext'
import { getChosung, joinChosung, startChosung, submitChosung } from './api'
import type { Subscribe } from '../../../shared/realtime/useChannelSocket'
import { HostEndButton } from '../HostControls'
import { useGameSession } from '../useGameSession'
import { Fuse } from '../Fuse'
import { useFuseCountdown, useBombSurvivorConfetti } from '../useFuseCountdown'
import { BombScorebar, BombFinishedBanner } from '../BombScorebar'

export function ChosungPanel({
  channelId,
  subscribe,
}: {
  channelId: number
  subscribe: Subscribe
}) {
  const { userId } = useAuth()
  const { state, loading, error, busy, run, refetch } = useGameSession(
    'chosung',
    channelId,
    subscribe,
    getChosung,
  )
  const [draft, setDraft] = useState('')

  const seconds = useFuseCountdown(state, refetch)
  useBombSurvivorConfetti(state, userId)

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

      <BombScorebar state={state} userId={userId} />

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
          <BombFinishedBanner state={state} userId={userId} />
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

      <HostEndButton channelId={channelId} kind="chosung" hostUserId={state.host_user_id} />
    </div>
  )
}

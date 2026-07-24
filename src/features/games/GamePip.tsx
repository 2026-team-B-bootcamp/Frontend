/**
 * 미니게임을 채팅 위에 띄우는 PIP(Picture-in-Picture) 플로팅 창.
 * 예전에는 우측 사이드 패널의 한 탭이라 멤버 목록과 자리를 다퉜는데, 이제 채팅을
 * 그대로 보면서 헤더를 잡고 옮길 수 있는 작은 창으로 분리했다.
 * 게임 선택(빙고·끝말잇기·오목)과 활성 게임 렌더만 담당하고, 실제 통신은 각 패널이 한다.
 * 창은 오른쪽 아래에 고정(앵커)돼 있어, 왼쪽 위 모서리 핸들을 끌면 그 대각선으로 커진다.
 * 크기는 뷰포트에 맞춰 자동으로 줄고(반응형), 사용자가 직접 조절한 값도 화면이 작아지면 다시 clamp된다.
 */
import { useEffect, useRef, useState, type ComponentType, type PointerEvent, type RefObject } from 'react'
import { motion, useDragControls } from 'motion/react'
import { BingoPanel } from './bingo/BingoPanel'
import { WordChainPanel } from './wordchain/WordChainPanel'
import { OmokPanel } from './omok/OmokPanel'
import { TicTacToePanel } from './tictactoe/TicTacToePanel'
import { BalancePanel } from './balance/BalancePanel'
import { ChosungPanel } from './chosung/ChosungPanel'
import { ChosungPreview } from './chosung/preview'
import {
  BalancePreview,
  BingoPreview,
  OmokPreview,
  TicTacToePreview,
  WordChainPreview,
} from './GamePreviews'
import { CloseIcon, DiceIcon } from '../../shared/ui/icons'
import { useIsMobile } from '../../shared/lib/useMediaQuery'
import { usePipDrag } from '../../shared/lib/usePipDrag'
import type { GameStatus, GamesStatus } from './gamesStatus'
import type { GameKind } from './gameKinds'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'

// 관전 유도용 상태 뱃지 — 대기 / 진행중 / 종료
const STATUS_BADGE: Record<Exclude<GameStatus, 'none'>, { emoji: string; label: string }> = {
  waiting: { emoji: '🙂', label: '대기' },
  playing: { emoji: '🟢', label: '진행중' },
  finished: { emoji: '🚩', label: '종료' },
}

const GAMES: { key: GameKind; label: string; Preview: ComponentType }[] = [
  { key: 'bingo', label: '빙고', Preview: BingoPreview },
  { key: 'wordchain', label: '끝말잇기', Preview: WordChainPreview },
  { key: 'omok', label: '오목', Preview: OmokPreview },
  { key: 'tictactoe', label: '틱택토', Preview: TicTacToePreview },
  { key: 'balance', label: '밸런스', Preview: BalancePreview },
  { key: 'chosung', label: '초성퀴즈', Preview: ChosungPreview },
]

const MIN_W = 240
const MIN_H = 260
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
// 뷰포트가 허용하는 최대 크기 — 창이 화면(여백 포함)을 넘지 않게 한다
const maxW = () => Math.max(MIN_W, window.innerWidth - 40)
const maxH = () => Math.max(MIN_H, window.innerHeight - 140)

export function GamePip({
  channelId,
  subscribe,
  onClose,
  constraintsRef,
  statuses,
}: {
  channelId: number
  subscribe: Subscribe
  onClose: () => void
  constraintsRef: RefObject<HTMLElement | null>
  // 게임 상태는 ChatPage에서 단일 useGamesStatus로 집계해 내려준다(이중 폴링 방지).
  statuses: GamesStatus
}) {
  const [gameKind, setGameKind] = useState<GameKind>('bingo')
  // 모바일에선 화면 폭을 꽉 채우는 시트로 뜬다 — 드래그·리사이즈·인라인 크기를 모두 CSS에 맡긴다
  const isMobile = useIsMobile()
  // 폭은 처음부터 컴팩트하게 고정, 높이는 null이면 내용에 맞춘다(작은 게임은 작게).
  // 사용자가 리사이즈를 시작하는 순간 그때의 실제 높이를 집어 명시값으로 전환한다.
  const [w, setW] = useState(() => clamp(300, MIN_W, maxW()))
  const [h, setH] = useState<number | null>(null)
  const pipRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  // 헤더에서만 드래그를 시작한다 — 본문의 게임 칸/버튼은 그대로 클릭되도록 dragListener를 끈다
  const dragControls = useDragControls()
  // 창 크기·뷰포트가 바뀌어도 채팅 본문 밖으로 나가지 않게 경계를 계속 다시 잰다
  const { x, y, dragConstraints } = usePipDrag(pipRef, constraintsRef, !isMobile)

  // 창이 열려 있는 동안 뷰포트가 줄면 크기도 경계 안으로 다시 맞춘다
  useEffect(() => {
    function onWinResize() {
      setW((cur) => clamp(cur, MIN_W, maxW()))
      setH((cur) => (cur == null ? null : clamp(cur, MIN_H, maxH())))
    }
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [])

  function onResizeStart(e: PointerEvent) {
    // 헤더 드래그로 번지지 않게 막고, 이 핸들이 포인터를 독점해 창 밖으로 나가도 추적한다
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { x: e.clientX, y: e.clientY, w, h: h ?? pipRef.current?.offsetHeight ?? MIN_H }
  }

  function onResizeMove(e: PointerEvent) {
    const s = resizeRef.current
    if (!s) return
    // 왼쪽 위 핸들: 왼쪽/위로 끌수록 커진다 (오른쪽 아래 모서리가 앵커라 고정)
    setW(clamp(s.w + (s.x - e.clientX), MIN_W, maxW()))
    setH(clamp(s.h + (s.y - e.clientY), MIN_H, maxH()))
  }

  function onResizeEnd(e: PointerEvent) {
    resizeRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <motion.div
      ref={pipRef}
      className="game-pip"
      style={isMobile ? { x, y } : { width: w, height: h ?? undefined, x, y }}
      drag={!isMobile}
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={dragConstraints}
      dragMomentum={false}
      dragElastic={0}
      // y는 드래그 위치를 담는 모션값이라 등장 애니메이션에서 건드리지 않는다(충돌 방지)
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* 왼쪽 위 리사이즈 핸들 — 헤더 위에 얹히지만 stopPropagation으로 드래그와 충돌하지 않는다 */}
      {!isMobile && (
        <div
          className="game-pip-resize"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          title="크기 조절"
        />
      )}

      <div
        className="game-pip-head"
        onPointerDown={isMobile ? undefined : (e) => dragControls.start(e)}
      >
        <span className="game-pip-title">
          <DiceIcon size={16} /> 미니게임
        </span>
        <button className="game-pip-close" onClick={onClose} title="닫기">
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="game-pip-body">
        <div className="game-select-grid">
          {GAMES.map((g) => {
            const st = statuses[g.key]
            const badge = st && st !== 'none' ? STATUS_BADGE[st] : null
            return (
              <button
                key={g.key}
                className={`game-select-card${gameKind === g.key ? ' active' : ''}`}
                onClick={() => setGameKind(g.key)}
              >
                {badge && (
                  <span className={`game-status-badge ${st}`} title={badge.label}>
                    {badge.emoji}
                  </span>
                )}
                <g.Preview />
                <span className="game-select-label">{g.label}</span>
              </button>
            )
          })}
        </div>

        {gameKind === 'bingo' && <BingoPanel channelId={channelId} subscribe={subscribe} />}
        {gameKind === 'wordchain' && <WordChainPanel channelId={channelId} subscribe={subscribe} />}
        {gameKind === 'omok' && <OmokPanel channelId={channelId} subscribe={subscribe} />}
        {gameKind === 'tictactoe' && <TicTacToePanel channelId={channelId} subscribe={subscribe} />}
        {gameKind === 'balance' && <BalancePanel channelId={channelId} subscribe={subscribe} />}
        {gameKind === 'chosung' && <ChosungPanel channelId={channelId} subscribe={subscribe} />}
      </div>
    </motion.div>
  )
}

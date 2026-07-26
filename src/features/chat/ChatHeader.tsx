/**
 * 채팅 헤더 — 드로어 열기, 채널 이름, 접속자 수, 멤버·미니게임·함께보기·그림판 토글.
 */
import { DiceIcon, MenuIcon, PaletteIcon, TvIcon, UsersIcon } from '../../shared/ui/icons'

export function ChatHeader({
  channelName,
  onOpenNav,
  onlineCount,
  showMembers,
  onToggleMembers,
  gameOpen,
  onToggleGame,
  anyGameLive,
  watchOpen,
  onToggleWatch,
  drawOpen,
  onToggleDraw,
}: {
  channelName?: string
  onOpenNav: () => void
  onlineCount: number
  showMembers: boolean
  onToggleMembers: () => void
  gameOpen: boolean
  onToggleGame: () => void
  anyGameLive: boolean
  watchOpen: boolean
  onToggleWatch: () => void
  drawOpen: boolean
  onToggleDraw: () => void
}) {
  return (
    <header className="chat-header">
      <button
        className="icon-btn nav-toggle"
        onClick={onOpenNav}
        title="채널 목록"
        aria-label="채널 목록 열기"
      >
        <MenuIcon size={18} />
      </button>
      <span className="chat-channel-name"># {channelName ?? '채팅'}</span>
      <div className="chat-header-links">
        <span className="online-count" title="접속 중">
          <span className="presence-dot on" /> {onlineCount}
        </span>
        <button
          className={`icon-btn${showMembers ? ' active' : ''}`}
          onClick={onToggleMembers}
          title="멤버"
        >
          <UsersIcon />
        </button>
        <button
          className={`icon-btn${gameOpen ? ' active' : ''}`}
          onClick={onToggleGame}
          title={anyGameLive ? '미니게임 (진행 중)' : '미니게임'}
        >
          <DiceIcon />
          {anyGameLive && <span className="icon-live-dot" />}
        </button>
        <button
          className={`icon-btn${watchOpen ? ' active' : ''}`}
          onClick={onToggleWatch}
          title="함께 보기"
        >
          <TvIcon />
        </button>
        <button
          className={`icon-btn${drawOpen ? ' active' : ''}`}
          onClick={onToggleDraw}
          title="공유 그림판"
        >
          <PaletteIcon />
        </button>
      </div>
    </header>
  )
}

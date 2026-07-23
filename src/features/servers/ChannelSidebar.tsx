/**
 * 채팅 화면 좌측 사이드바 — 현재 서버 이름/초대코드, 채널 목록, 채널 추가, 내 프로필/로그아웃 버튼.
 * 채널 선택은 라우팅(Link)으로 처리하고, 채널 추가는 onAddChannel prop을 통해
 * ChatPage가 servers/api.ts(createChannel)로 백엔드에 요청하도록 위임한다.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CopyIcon, LogoutIcon } from '../../shared/ui/icons'
import { Avatar } from '../../shared/ui/Avatar'
import { useAuth } from '../auth/authContext'
import type { Channel, Server } from './api'

export function ChannelSidebar({
  server,
  channels,
  activeChannelId,
  displayName,
  onAddChannel,
  onProfile,
  onLogout,
  onNavigate,
}: {
  server?: Server
  channels: Channel[]
  activeChannelId: number
  displayName: string | null
  onAddChannel: (name: string) => Promise<void>
  onProfile: () => void
  onLogout: () => void
  // 채널을 골랐을 때 부모가 할 후처리 — 모바일에선 드로어를 닫는다
  onNavigate?: () => void
}) {
  // 아바타를 그리려면 내 user id와 사진 URL이 필요하다 — prop을 늘리는 대신 컨텍스트에서 직접 읽는다
  const { userId, avatarUrl } = useAuth()
  const [copied, setCopied] = useState(false)
  const [newChannel, setNewChannel] = useState('')
  const [adding, setAdding] = useState(false)

  async function onCopyInvite() {
    if (!server) return
    try {
      await navigator.clipboard.writeText(server.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한 없음 — 코드는 항상 화면에 보이므로 무시
    }
  }

  // 채널 추가 폼 제출 — 실제 생성 요청은 부모(ChatPage)의 onAddChannel이 담당
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const name = newChannel.trim()
    if (!name || !server) return
    setAdding(true)
    try {
      await onAddChannel(name)
      setNewChannel('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <aside className="chat-sidebar">
      <div className="sidebar-head">
        <div className="sidebar-server-name">{server?.name ?? '서버'}</div>
        {server && (
          <button className="invite-chip" onClick={onCopyInvite} title="초대코드 복사">
            <span className="invite-code">{server.invite_code}</span>
            <CopyIcon />
            <AnimatePresence>
              {copied && (
                <motion.span
                  className="copied-note"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  복사됨!
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>

      <div className="sidebar-section">채널</div>
      {/* 채널 선택: 라우트만 바꾸면 ChatPage가 channelId를 읽어 해당 채팅방을 보여준다 */}
      <nav className="sidebar-channels">
        {channels.map((c) => (
          <Link
            key={c.id}
            to={`/servers/${c.server_id}/channels/${c.id}`}
            className={`sidebar-channel${c.id === activeChannelId ? ' active' : ''}`}
            onClick={onNavigate}
          >
            <span className="hash">#</span>
            <span className="name">{c.name}</span>
          </Link>
        ))}
      </nav>

      <form className="channel-add" onSubmit={onSubmit}>
        <input
          className="input"
          placeholder="+ 새 채널"
          value={newChannel}
          maxLength={100}
          onChange={(e) => setNewChannel(e.target.value)}
          disabled={adding}
        />
      </form>

      {/* 내 프로필 패널 — 예전엔 이름 한 줄 + 작은 글자 링크 두 개뿐이라 초라했다.
          아바타를 큼직하게 보여주고, 패널 전체를 눌러 프로필을 열 수 있게 했다. */}
      <div className="sidebar-me">
        <button
          type="button"
          className="sidebar-me-main"
          onClick={onProfile}
          title="프로필 편집"
        >
          <Avatar userId={userId ?? 0} name={displayName ?? '?'} url={avatarUrl} size={38} />
          <span className="sidebar-me-text">
            <span className="sidebar-me-name">{displayName ?? '사용자'}</span>
            <span className="sidebar-me-sub">프로필 편집</span>
          </span>
        </button>
        <button
          type="button"
          className="sidebar-me-logout"
          onClick={onLogout}
          title="로그아웃"
          aria-label="로그아웃"
        >
          <LogoutIcon size={17} />
        </button>
      </div>
    </aside>
  )
}

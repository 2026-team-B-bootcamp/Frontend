import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CopyIcon } from '../../shared/ui/icons'
import type { Channel, Server } from './api'

export function ChannelSidebar({
  server,
  channels,
  activeChannelId,
  displayName,
  onAddChannel,
  onProfile,
  onLogout,
}: {
  server?: Server
  channels: Channel[]
  activeChannelId: number
  displayName: string | null
  onAddChannel: (name: string) => Promise<void>
  onProfile: () => void
  onLogout: () => void
}) {
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
      <nav className="sidebar-channels">
        {channels.map((c) => (
          <Link
            key={c.id}
            to={`/servers/${c.server_id}/channels/${c.id}`}
            className={`sidebar-channel${c.id === activeChannelId ? ' active' : ''}`}
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

      <div className="sidebar-me">
        <span>{displayName}</span>
        <div className="sidebar-me-actions">
          <button onClick={onProfile}>프로필</button>
          <button onClick={onLogout}>로그아웃</button>
        </div>
      </div>
    </aside>
  )
}

/**
 * 채팅 화면 좌측 사이드바 — 현재 서버 이름/초대코드, 채널 목록, 채널 추가·삭제,
 * 모임 삭제·나가기, 사이드바 색 고르기, 내 프로필/로그아웃 버튼.
 * 채널 선택은 라우팅(Link)으로 처리하고, 나머지 동작은 prop으로 받은 콜백을 통해
 * ChatPage가 servers/api.ts로 백엔드에 요청하도록 위임한다.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CopyIcon, LogoutIcon, MoreIcon, PencilIcon, TrashIcon } from '../../shared/ui/icons'
import { Avatar } from '../../shared/ui/Avatar'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { useAuth } from '../auth/authContext'
import { SidebarThemePicker } from './SidebarThemePicker'
import type { Channel, Server } from './api'

/**
 * 이름을 그 자리에서 고치는 한 줄 입력.
 *
 * 이름 바꾸기 때문에 모달을 띄우지 않는다 — 서버 이름도 채널 이름도 이미 화면에
 * 글자로 있으니, 같은 자리에서 글자만 입력칸으로 바뀌는 편이 훨씬 덜 거슬린다.
 * Enter로 저장 / Esc로 취소 / 포커스를 잃으면 저장(누르러 간 곳이 다른 버튼이어도
 * 적어둔 것이 날아가지 않게).
 */
function InlineRename({
  initial,
  onSubmit,
  onCancel,
  className,
  ariaLabel,
}: {
  initial: string
  onSubmit: (name: string) => void
  onCancel: () => void
  className: string
  ariaLabel: string
}) {
  const [value, setValue] = useState(initial)

  function commit() {
    const name = value.trim()
    // 빈 이름이나 그대로인 이름은 저장할 게 없다 — 조용히 닫는다.
    if (!name || name === initial) onCancel()
    else onSubmit(name)
  }

  return (
    <input
      className={className}
      aria-label={ariaLabel}
      value={value}
      maxLength={100}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      // 채널 행에서는 이 입력이 Link 안에 있지 않지만, 부모의 클릭 핸들러
      // (드로어 닫기 등)까지 번지면 편집 중에 화면이 바뀐다.
      onClick={(e) => e.stopPropagation()}
    />
  )
}

export function ChannelSidebar({
  server,
  channels,
  activeChannelId,
  displayName,
  onAddChannel,
  onRenameServer,
  onRenameChannel,
  onDeleteChannel,
  onDeleteServer,
  onLeaveServer,
  onProfile,
  onLogout,
  onNavigate,
}: {
  server?: Server
  channels: Channel[]
  activeChannelId: number
  displayName: string | null
  onAddChannel: (name: string) => Promise<void>
  onRenameServer: (name: string) => Promise<void>
  onRenameChannel: (channelId: number, name: string) => Promise<void>
  onDeleteChannel: (channelId: number) => Promise<void>
  onDeleteServer: () => Promise<void>
  onLeaveServer: () => Promise<void>
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
  // 지금 이름을 고치고 있는 대상. 서버 이름과 채널은 동시에 고칠 일이 없어
  // 상태 하나로 둔다 (null = 아무것도 편집 중 아님).
  const [editing, setEditing] = useState<{ kind: 'server' } | { kind: 'channel'; id: number } | null>(
    null,
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  // 확인 모달로 잡아 둔 동작. 한 번에 하나만 열리므로 상태 하나로 둔다.
  const [pending, setPending] = useState<
    { kind: 'channel'; channel: Channel } | { kind: 'deleteServer' } | { kind: 'leaveServer' } | null
  >(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 방장만 지울 수 있다 — 버튼을 감추는 것은 편의고, 진짜 차단은 백엔드가 한다.
  const amOwner = server != null && server.owner_user_id === userId
  // 마지막 채널은 백엔드가 400으로 막는다. 눌러봐야 거절당할 버튼은 아예 감춘다.
  const canDeleteChannel = amOwner && channels.length > 1

  // 메뉴 바깥을 누르거나 Esc를 누르면 닫는다 — 열어둔 채로 다른 곳을 만지다가
  // 파괴적 항목을 실수로 누르는 일이 없게 한다.
  useEffect(() => {
    if (!menuOpen) return
    function onPointer(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function openPending(next: NonNullable<typeof pending>) {
    setMenuOpen(false)
    setError(null)
    setPending(next)
  }

  // 확인 모달의 "삭제/나가기"를 눌렀을 때. 성공하면 부모가 화면을 옮기거나 목록을
  // 갱신하므로 여기서는 모달만 닫는다. 실패하면 모달을 열어둔 채 이유를 보여준다 —
  // 조용히 닫히면 눌렀는데 아무 일도 안 일어난 것처럼 보인다.
  async function runPending() {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      if (pending.kind === 'channel') await onDeleteChannel(pending.channel.id)
      else if (pending.kind === 'deleteServer') await onDeleteServer()
      else await onLeaveServer()
      setPending(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

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
        {editing?.kind === 'server' && server ? (
          <InlineRename
            className="input sidebar-rename-input"
            ariaLabel="모임 이름"
            initial={server.name}
            onCancel={() => setEditing(null)}
            onSubmit={(name) => {
              setEditing(null)
              // 실패해도 부모가 목록을 되돌려 그리므로 여기서는 붙잡지 않는다.
              void onRenameServer(name)
            }}
          />
        ) : (
          <div className="sidebar-name-row">
            <div className="sidebar-server-name">{server?.name ?? '서버'}</div>
            {server && (
              <button
                type="button"
                className="sidebar-rename-btn"
                onClick={() => setEditing({ kind: 'server' })}
                title="모임 이름 바꾸기"
                aria-label="모임 이름 바꾸기"
              >
                <PencilIcon size={13} />
              </button>
            )}
            {/* 모임 삭제·나가기는 메뉴 안에 접어둔다. 이름 바꾸기 연필 옆에
                나란히 두면 한 칸 어긋난 클릭이 곧 모임 삭제가 된다. */}
            {server && (
              <div className="sidebar-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className={`sidebar-rename-btn${menuOpen ? ' open' : ''}`}
                  onClick={() => setMenuOpen((v) => !v)}
                  title="모임 메뉴"
                  aria-label="모임 메뉴"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <MoreIcon size={14} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      className="sidebar-menu"
                      role="menu"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.14, ease: 'easeOut' }}
                    >
                      {/* 방장은 나갈 수 없다(백엔드가 400). 남길 수 있는 선택지가
                          삭제뿐이므로 역할에 따라 항목 자체를 바꾼다. */}
                      {amOwner ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="sidebar-menu-item danger"
                          onClick={() => openPending({ kind: 'deleteServer' })}
                        >
                          <TrashIcon size={14} />
                          모임 삭제
                        </button>
                      ) : (
                        <button
                          type="button"
                          role="menuitem"
                          className="sidebar-menu-item danger"
                          onClick={() => openPending({ kind: 'leaveServer' })}
                        >
                          <LogoutIcon size={15} />
                          모임 나가기
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
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
        {channels.map((c) =>
          editing?.kind === 'channel' && editing.id === c.id ? (
            // 편집 중엔 Link를 통째로 입력칸으로 바꾼다 — 링크 안에 입력칸을 두면
            // 글자를 고치려고 누른 클릭이 그대로 채널 이동으로 새어 나간다.
            <div key={c.id} className="sidebar-channel editing">
              <span className="hash">#</span>
              <InlineRename
                className="input sidebar-rename-input"
                ariaLabel="채널 이름"
                initial={c.name}
                onCancel={() => setEditing(null)}
                onSubmit={(name) => {
                  setEditing(null)
                  void onRenameChannel(c.id, name)
                }}
              />
            </div>
          ) : (
            <div
              key={c.id}
              className={`sidebar-channel-row${canDeleteChannel ? ' has-delete' : ''}`}
            >
              <Link
                to={`/servers/${c.server_id}/channels/${c.id}`}
                className={`sidebar-channel${c.id === activeChannelId ? ' active' : ''}`}
                onClick={onNavigate}
              >
                <span className="hash">#</span>
                <span className="name">{c.name}</span>
              </Link>
              <div className="sidebar-channel-actions">
                <button
                  type="button"
                  className="sidebar-rename-btn"
                  onClick={() => setEditing({ kind: 'channel', id: c.id })}
                  title="채널 이름 바꾸기"
                  aria-label={`${c.name} 채널 이름 바꾸기`}
                >
                  <PencilIcon size={13} />
                </button>
                {canDeleteChannel && (
                  <button
                    type="button"
                    className="sidebar-rename-btn danger"
                    onClick={() => openPending({ kind: 'channel', channel: c })}
                    title="채널 삭제"
                    aria-label={`${c.name} 채널 삭제`}
                  >
                    <TrashIcon size={13} />
                  </button>
                )}
              </div>
            </div>
          ),
        )}
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
        <SidebarThemePicker />
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

      {/* 되돌릴 수 없는 세 가지를 한 번 더 묻는다. 모임 삭제만 이름을 직접 입력받는데,
          피해 범위가 채널 하나가 아니라 모임 전체(모든 채널·대화·멤버)이기 때문이다. */}
      <ConfirmDialog
        open={pending?.kind === 'channel'}
        title="이 채널을 삭제할까요?"
        description="채널 안의 대화가 모두 사라지고 되돌릴 수 없어요."
        target={pending?.kind === 'channel' ? `# ${pending.channel.name}` : undefined}
        busy={busy}
        error={error}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'deleteServer'}
        title="이 모임을 삭제할까요?"
        description="모든 채널과 대화, 멤버가 함께 사라지고 되돌릴 수 없어요."
        target={server?.name}
        confirmText={server?.name}
        busy={busy}
        error={error}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'leaveServer'}
        title="이 모임에서 나갈까요?"
        description="남긴 메시지는 그대로 남고, 초대코드로 다시 들어올 수 있어요."
        target={server?.name}
        confirmLabel="나가기"
        busy={busy}
        error={error}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </aside>
  )
}

/**
 * 채팅 화면 좌측 사이드바 — 현재 서버 이름/초대코드, 채널 목록, 채널 추가·삭제,
 * 모임 삭제·나가기, 사이드바 색 고르기, 내 프로필/로그아웃 버튼.
 * 채널 선택은 라우팅(Link)으로 처리하고, 나머지 동작은 prop으로 받은 콜백을 통해
 * ChatPage가 servers/api.ts로 백엔드에 요청하도록 위임한다.
 *
 * 화면은 SidebarHead(서버 이름·메뉴·초대칩) / ChannelList(채널 목록) /
 * SidebarMe(내 프로필) / SidebarDangerDialogs(삭제·나가기 확인 모달)로 나뉜다.
 * 편집 대상(editing)은 SidebarHead·ChannelList가 함께 쓰고, 삭제·나가기 확인
 * (pending/busy/error)은 SidebarHead·ChannelList·SidebarDangerDialogs 셋이 얽혀
 * 있으므로 이 컴포넌트가 상태를 쥐고 자식에는 값과 콜백만 내려준다.
 */
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/authContext'
import { SidebarHead } from './SidebarHead'
import { ChannelList } from './ChannelList'
import { SidebarMe } from './SidebarMe'
import { SidebarDangerDialogs, type SidebarPendingAction } from './SidebarDangerDialogs'
import type { Channel, Server } from './api'

// 서버 이름 편집과 채널 이름 편집은 동시에 일어나지 않으므로 상태 하나로 표현한다.
// SidebarHead(서버 이름)와 ChannelList(채널 이름)가 함께 쓴다.
export type SidebarEditingState = { kind: 'server' } | { kind: 'channel'; id: number } | null

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
  const [newChannel, setNewChannel] = useState('')
  const [adding, setAdding] = useState(false)
  // 지금 이름을 고치고 있는 대상. 서버 이름과 채널은 동시에 고칠 일이 없어
  // 상태 하나로 둔다 (null = 아무것도 편집 중 아님).
  const [editing, setEditing] = useState<SidebarEditingState>(null)
  // 확인 모달로 잡아 둔 동작. 한 번에 하나만 열리므로 상태 하나로 둔다.
  const [pending, setPending] = useState<SidebarPendingAction>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 방장만 지울 수 있다 — 버튼을 감추는 것은 편의고, 진짜 차단은 백엔드가 한다.
  const amOwner = server != null && server.owner_user_id === userId
  // 마지막 채널은 백엔드가 400으로 막는다. 눌러봐야 거절당할 버튼은 아예 감춘다.
  const canDeleteChannel = amOwner && channels.length > 1

  function openPending(next: NonNullable<SidebarPendingAction>) {
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
      <SidebarHead
        server={server}
        amOwner={amOwner}
        editing={editing}
        setEditing={setEditing}
        onRenameServer={onRenameServer}
        onRequestDeleteServer={() => openPending({ kind: 'deleteServer' })}
        onRequestLeaveServer={() => openPending({ kind: 'leaveServer' })}
      />

      <ChannelList
        channels={channels}
        activeChannelId={activeChannelId}
        editing={editing}
        setEditing={setEditing}
        canDeleteChannel={canDeleteChannel}
        onRenameChannel={onRenameChannel}
        onRequestDeleteChannel={(channel) => openPending({ kind: 'channel', channel })}
        onNavigate={onNavigate}
      />

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

      <SidebarMe
        userId={userId}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onProfile={onProfile}
        onLogout={onLogout}
      />

      <SidebarDangerDialogs
        server={server}
        pending={pending}
        busy={busy}
        error={error}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </aside>
  )
}

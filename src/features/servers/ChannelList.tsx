/**
 * 채널 목록 — 채널 선택(라우팅), 인라인 이름 바꾸기, 삭제 버튼.
 * 편집 대상(editing)은 사이드바 상단과 공유하는 상태라 부모가 쥐고 내려준다.
 */
import { Link } from 'react-router-dom'
import { PencilIcon, TrashIcon } from '../../shared/ui/icons'
import { InlineRename } from './InlineRename'
import type { Channel } from './api'
import type { SidebarEditingState } from './ChannelSidebar'

export function ChannelList({
  channels,
  activeChannelId,
  editing,
  setEditing,
  canDeleteChannel,
  onRenameChannel,
  onRequestDeleteChannel,
  onNavigate,
}: {
  channels: Channel[]
  activeChannelId: number
  editing: SidebarEditingState
  setEditing: (next: SidebarEditingState) => void
  canDeleteChannel: boolean
  onRenameChannel: (channelId: number, name: string) => Promise<void>
  onRequestDeleteChannel: (channel: Channel) => void
  // 채널을 골랐을 때 부모가 할 후처리 — 모바일에선 드로어를 닫는다
  onNavigate?: () => void
}) {
  return (
    <>
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
                    onClick={() => onRequestDeleteChannel(c)}
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
    </>
  )
}

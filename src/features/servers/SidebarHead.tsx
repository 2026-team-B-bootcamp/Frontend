/**
 * 채널 사이드바 상단 — 서버 이름(인라인 이름 바꾸기), 모임 메뉴(삭제/나가기),
 * 초대코드 복사 칩. 편집 대상(editing)은 채널 목록과 공유하는 상태라 부모가 쥐고
 * 내려준다.
 */
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CopyIcon, LogoutIcon, MoreIcon, PencilIcon, TrashIcon } from '../../shared/ui/icons'
import { useDismissOnOutside } from '../../shared/lib/useDismissOnOutside'
import { InlineRename } from './InlineRename'
import type { Server } from './api'
import type { SidebarEditingState } from './ChannelSidebar'

export function SidebarHead({
  server,
  amOwner,
  editing,
  setEditing,
  onRenameServer,
  onRequestDeleteServer,
  onRequestLeaveServer,
}: {
  server?: Server
  amOwner: boolean
  editing: SidebarEditingState
  setEditing: (next: SidebarEditingState) => void
  onRenameServer: (name: string) => Promise<void>
  onRequestDeleteServer: () => void
  onRequestLeaveServer: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 메뉴 바깥을 누르거나 Esc를 누르면 닫는다 — 열어둔 채로 다른 곳을 만지다가
  // 파괴적 항목을 실수로 누르는 일이 없게 한다.
  useDismissOnOutside(menuRef, menuOpen, () => setMenuOpen(false))

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

  return (
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
                        onClick={() => {
                          setMenuOpen(false)
                          onRequestDeleteServer()
                        }}
                      >
                        <TrashIcon size={14} />
                        모임 삭제
                      </button>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        className="sidebar-menu-item danger"
                        onClick={() => {
                          setMenuOpen(false)
                          onRequestLeaveServer()
                        }}
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
  )
}

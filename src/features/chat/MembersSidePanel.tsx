/**
 * 우측 멤버 패널 — 데스크톱에선 고정 사이드 패널, 좁은 화면에선 채팅 위를 덮는
 * 오버레이(뒤 스크림을 탭해 닫을 수 있다). MembersPanel.tsx는 e2e 계약이라 손대지
 * 않고 그대로 감싼다.
 */
import { AnimatePresence, motion } from 'motion/react'
import { CloseIcon } from '../../shared/ui/icons'
import { MembersPanel } from './MembersPanel'

export function MembersSidePanel({
  show,
  panelIsOverlay,
  onClose,
  serverId,
  membersRefresh,
  online,
  onOpenTagStats,
}: {
  show: boolean
  panelIsOverlay: boolean
  onClose: () => void
  serverId: number
  membersRefresh: number
  online: Set<number>
  onOpenTagStats: () => void
}) {
  return (
    <>
      {/* 모바일에서 멤버 패널은 채팅 위를 덮는 오버레이라 뒤를 탭해 닫을 수 있어야 한다 */}
      <AnimatePresence>
        {show && panelIsOverlay && (
          <motion.div
            className="side-scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {show && (
          <motion.aside
            className="side-panel"
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="panel-head">
              <span className="panel-head-title">멤버</span>
              <button
                className="panel-close"
                onClick={onClose}
                title="닫기"
                aria-label="멤버 패널 닫기"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <div className="panel-body">
              {/* 프로필 저장 후(membersRefresh 증가) key가 바뀌어 리마운트 → 태그 변경이 바로 반영됨 */}
              <MembersPanel
                key={`${serverId}-${membersRefresh}`}
                serverId={serverId}
                online={online}
                onOpenTagStats={onOpenTagStats}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

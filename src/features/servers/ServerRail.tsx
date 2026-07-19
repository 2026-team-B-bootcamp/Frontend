/**
 * 채팅 화면 맨 왼쪽에 붙는 서버 아이콘 세로 레일.
 * 아이콘 클릭으로 서버를 전환하고(onSelect), "+" 버튼으로 서버 추가/참여 모달을 연다(onAdd).
 * 실제 데이터 로드는 상위(ChatPage)가 servers/api.ts로 미리 해두고 목록만 props로 받는다.
 */
import { motion } from 'motion/react'
import { PlusIcon } from '../../shared/ui/icons'
import { serverColor } from '../../shared/lib/colors'
import type { Server } from './api'

export function ServerRail({
  servers,
  activeId,
  onSelect,
  onAdd,
}: {
  servers: Server[]
  activeId: number
  onSelect: (serverId: number) => void
  onAdd: () => void
}) {
  return (
    <nav className="server-rail">
      <div className="rail-list">
        {servers.map((s) => (
          <motion.button
            key={s.id}
            className={`rail-item${s.id === activeId ? ' active' : ''}`}
            style={{ background: serverColor(s.id) }}
            title={s.name}
            onClick={() => onSelect(s.id)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            {s.name.charAt(0)}
            {s.id === activeId && <motion.span className="rail-pill" layoutId="rail-pill" />}
          </motion.button>
        ))}
      </div>
      <motion.button
        className="rail-add"
        title="서버 추가/참여"
        onClick={onAdd}
        whileHover={{ scale: 1.08, rotate: 90 }}
        whileTap={{ scale: 0.95 }}
      >
        <PlusIcon size={18} />
      </motion.button>
    </nav>
  )
}

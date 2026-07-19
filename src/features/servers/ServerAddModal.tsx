import { motion } from 'motion/react'
import { ServerForms } from './ServerForms'
import type { Server } from './api'

export function ServerAddModal({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (server: Server) => void
}) {
  return (
    <motion.div
      className="modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <h2>서버 추가</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          새 모임 공간을 만들거나, 받은 초대코드로 참여하세요
        </p>
        <ServerForms onDone={onDone} />
      </motion.div>
    </motion.div>
  )
}

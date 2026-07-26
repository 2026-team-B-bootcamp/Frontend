/**
 * 채널에 처음 들어온 사람을 위한 환영·자기소개 카드. content는 백엔드가 생성한 인사말이고,
 * 관심사 태그가 있으면 함께 보여준다.
 */
import { motion } from 'motion/react'
import type { Message } from '../api'
import { Avatar } from '../../../shared/ui/Avatar'
import { TagPills } from '../../users/TagPills'
import { SparkIcon } from '../../../shared/ui/icons'

export function WelcomeCard({ message }: { message: Message }) {
  const hasTags = message.tags.some((t) => t && t.trim().length > 0)
  return (
    <motion.div
      className="chat-welcome"
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <span className="chat-welcome-glow" aria-hidden="true" />
      <div className="chat-welcome-inner">
        <Avatar
          userId={message.user_id}
          name={message.display_name}
          url={message.avatar_url}
          size={46}
          className="chat-welcome-avatar"
        />
        <div className="chat-welcome-body">
          <span className="chat-welcome-label">
            <SparkIcon size={13} /> NEW MEMBER
          </span>
          <p className="chat-welcome-text">{message.content}</p>
          {hasTags && <TagPills tags={message.tags} />}
        </div>
      </div>
    </motion.div>
  )
}

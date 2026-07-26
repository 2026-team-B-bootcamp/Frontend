import { motion } from 'motion/react'
import { TagPills } from '../../users/TagPills'
import { SparkIcon } from '../../../shared/ui/icons'

export function MockAI() {
  return (
    <div className="lm-screen">
      <div className="lm-screen-head">
        <SparkIcon size={14} /> AI 아이스브레이커
      </div>
      <div className="lm-ai-target">
        <span className="chat-avatar" style={{ background: '#6f8f66' }}>지</span>
        <span>지우님에게 말 걸기</span>
        <TagPills tags={['캠핑', '재즈']} />
      </div>
      <motion.div
        className="lm-ai-question"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        "지우님, 캠핑 좋아하신다고 들었어요. 최근에 다녀온 캠핑장 중 최고는 어디였어요?"
      </motion.div>
      <div className="lm-ai-actions">
        <span className="btn small">이 질문으로 시작</span>
        <span className="btn ghost small">다시 생성</span>
      </div>
    </div>
  )
}

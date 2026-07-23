/**
 * 입력창 위에 뜨는 이모지 선택 팝오버. 카테고리별 그리드에서 고르면 onPick으로 문자를 넘긴다.
 * 데이터는 emojiData.ts를 공유한다(렌더러의 :shortcode: 변환과 동일 소스).
 */
import { motion } from 'motion/react'
import { EMOJI_GROUPS } from './emojiData'

export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (char: string) => void
  onClose: () => void
}) {
  return (
    <motion.div
      className="emoji-popover"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <div className="emoji-popover-head">
        <span className="ib-popover-title" style={{ padding: 0 }}>
          이모지
        </span>
        <button type="button" className="emoji-close" onClick={onClose} title="닫기">
          ✕
        </button>
      </div>
      <div className="emoji-scroll">
        {EMOJI_GROUPS.map((g) => (
          <div key={g.label} className="emoji-group">
            <div className="emoji-group-label">{g.label}</div>
            <div className="emoji-grid">
              {g.emojis.map((e) => (
                <button
                  key={e.name}
                  type="button"
                  className="emoji-cell"
                  title={`:${e.name}:`}
                  onClick={() => onPick(e.char)}
                >
                  {e.char}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

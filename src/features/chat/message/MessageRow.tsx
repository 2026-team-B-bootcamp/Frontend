/**
 * 일반 채팅 메시지 한 줄 — 아바타/이름/시간, 본문(리치텍스트), 태그, 링크 프리뷰, 삭제 버튼.
 * 같은 사람이 연달아 보낸 메시지(grouped)는 아바타 대신 시간만 왼쪽 여백에 보여준다.
 */
import type { Message } from '../api'
import { Avatar } from '../../../shared/ui/Avatar'
import { TagPills } from '../../users/TagPills'
import { TrashIcon } from '../../../shared/ui/icons'
import { avatarColor } from '../../../shared/lib/colors'
import { renderRichText } from '../richText'
import { LinkPreview } from '../LinkPreview'
import { timeLabel, previewUrl } from './format'

export function MessageRow({
  message,
  grouped,
  mine,
  onRequestDelete,
}: {
  message: Message
  grouped: boolean
  mine: boolean
  onRequestDelete: (message: Message) => void
}) {
  const hasTags = message.tags.some((t) => t && t.trim().length > 0)
  const link = previewUrl(message.content)
  return (
    <div className={`chat-row${grouped ? ' grouped' : ''}`}>
      {grouped ? (
        <span className="chat-gutter">{timeLabel(message.created_at)}</span>
      ) : (
        <Avatar userId={message.user_id} name={message.display_name} url={message.avatar_url} />
      )}
      <div className="chat-body">
        {!grouped && (
          <div className="chat-head">
            <span className="chat-name" style={{ color: avatarColor(message.user_id) }}>
              {message.display_name}
            </span>
            <span className="chat-time">{timeLabel(message.created_at)}</span>
          </div>
        )}
        {/* 내 메시지에만 삭제 버튼 — 평소엔 숨어 있다가 행에 마우스를 올리면 나온다 */}
        {mine && (
          <button
            type="button"
            className="chat-delete"
            title="메시지 삭제"
            aria-label="메시지 삭제"
            onClick={() => onRequestDelete(message)}
          >
            <TrashIcon size={14} />
          </button>
        )}
        <div className="chat-text">{renderRichText(message.content)}</div>
        {/* 관심사 태그는 메시지 아래에 둔다. 이름 옆은 자리가 좁아 길면
            잘리고 시간·이름과 섞여 잘 안 읽혔다. 묶인 연속 메시지에는
            붙이지 않는다 — 한 사람이 여러 줄 쓰면 태그가 줄마다 반복된다. */}
        {!grouped && hasTags && <TagPills tags={message.tags} />}
        {link && <LinkPreview url={link} />}
      </div>
    </div>
  )
}

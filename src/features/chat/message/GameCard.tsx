/**
 * 게임이 새로 열렸다는 알림 카드 — 채팅만 보던 사람도 바로 들어갈 수 있게 입장 버튼을 함께 둔다.
 * content에는 게임 키만 들어있고(백엔드 app/slack/features.py 참고), 화면에 보일 문구는 여기서 만든다.
 */
import { Link } from 'react-router-dom'
import type { Message } from '../api'
import { Avatar } from '../../../shared/ui/Avatar'
import { timeLabel } from './format'

// 게임 입장 카드에 쓸 이름표. 백엔드는 content에 게임 키만 담아 보내므로
// (문구를 서버에 굳혀두면 표현을 바꿔도 이미 쌓인 메시지는 옛 문구로 남는다)
// 그릴 때 여기서 문구를 만든다. Backend/app/slack/features.py의 라벨과 맞춰둔다.
const GAME_LABELS: Record<string, string> = {
  bingo: '🎲 빙고',
  wordchain: '🔤 끝말잇기',
  omok: '⚫ 오목',
  tictactoe: '⭕ 틱택토',
  balance: '⚖️ 밸런스게임',
  chosung: '🔠 초성퀴즈',
}

export function GameCard({
  message,
  serverId,
  channelId,
}: {
  message: Message
  serverId: number
  channelId: number
}) {
  return (
    <div className="chat-game-card">
      <Avatar
        userId={message.user_id}
        name={message.display_name}
        url={message.avatar_url}
        size={34}
      />
      <div className="chat-game-body">
        <p className="chat-game-text">
          <b>{message.display_name}</b>님이{' '}
          <b>{GAME_LABELS[message.content] ?? message.content}</b> 게임을 열었어요!
        </p>
        <span className="chat-game-time">{timeLabel(message.created_at)}</span>
      </div>
      <Link
        className="chat-game-join"
        to={`/servers/${serverId}/channels/${channelId}/play/${message.content}`}
      >
        입장하기
      </Link>
    </div>
  )
}

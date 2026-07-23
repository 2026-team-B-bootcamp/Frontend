/**
 * 채팅 기능의 API 계층 — apiFetch(shared/api/client)로 실제 HTTP 요청을 백엔드에 보낸다.
 * ChatRoom 컴포넌트가 이 함수들을 호출해 메시지를 불러오고/보내고, 아이스브레이커 질문을 받는다.
 */
import { apiFetch } from '../../shared/api/client'

export interface Message {
  id: number
  user_id: number
  display_name: string
  // 작성자 프로필 사진 (없으면 이름 첫 글자 아바타로 대체)
  avatar_url: string | null
  tags: string[]
  content: string
  // 'user' = 사람이 쓴 메시지, 'welcome' = 첫 입장 시 자동 생성된 환영·자기소개 카드
  kind: 'user' | 'welcome'
  created_at: string
}

export interface IcebreakerResponse {
  questions: string[]
}

// 메시지 전송: 채널에 새 메시지를 POST하고 생성된 메시지를 그대로 돌려받는다
export function sendMessage(channelId: number, content: string) {
  return apiFetch<Message>(`/channels/${channelId}/messages`, {
    method: 'POST',
    body: { content },
  })
}

// 메시지 조회: afterId를 주면 그 id 이후만(재연결 시 놓친 메시지 보충용),
// beforeId를 주면 그 id 이전만(위로 무한 스크롤용) 가져온다
export function listMessages(channelId: number, afterId?: number, beforeId?: number) {
  const qs = afterId
    ? `?after_id=${afterId}`
    : beforeId
      ? `?before_id=${beforeId}`
      : ''
  return apiFetch<Message[]>(`/channels/${channelId}/messages${qs}`)
}

// 내가 쓴 메시지를 지운다 (백엔드는 소프트 삭제 후 채널에 message.deleted를 방송한다)
export function deleteMessage(channelId: number, messageId: number) {
  return apiFetch<void>(`/channels/${channelId}/messages/${messageId}`, { method: 'DELETE' })
}

// 채널에 처음 들어온 사람의 환영·자기소개 카드를 만든다.
// 이미 이 채널에 남긴 메시지가 있으면 백엔드가 null을 돌려주고 아무것도 만들지 않는다.
export function createWelcome(channelId: number) {
  return apiFetch<Message | null>(`/channels/${channelId}/messages/welcome`, { method: 'POST' })
}

// 특정 멤버를 상대로 AI가 만들어주는 대화 시작 질문 후보들(최대 3개)을 요청한다.
// tags: 모달에서 고른 관심사(상대 태그의 부분집합) — 생략하면 상대 태그 전체 사용.
export function getIcebreaker(serverId: number, userId: number, tags?: string[]) {
  return apiFetch<IcebreakerResponse>(
    `/servers/${serverId}/members/${userId}/icebreaker`,
    { method: 'POST', body: tags ? { tags } : {} },
  )
}

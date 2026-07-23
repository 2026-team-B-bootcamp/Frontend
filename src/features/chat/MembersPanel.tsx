/**
 * 채팅 화면 우측 "멤버" 패널 — 현재 서버에 속한 멤버 목록과 각자의 관심사 태그를 보여준다.
 * servers/api.ts의 getMembers로 멤버 목록을 불러오고, 태그 렌더링/겹치는 태그 강조는
 * TagPills 컴포넌트에 위임한다.
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { getMembers, type Member } from '../servers/api'
import { TagPills } from '../users/TagPills'
import { ApiError } from '../../shared/api/client'
import { Avatar } from '../../shared/ui/Avatar'

export function MembersPanel({ serverId, online }: { serverId: number; online: Set<number> }) {
  const { userId } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getMembers(serverId)
      .then((ms) => {
        if (active) setMembers(ms)
      })
      .catch((err) => {
        if (active)
          setError(err instanceof ApiError ? err.message : '멤버를 불러오지 못했습니다')
      })
    return () => {
      active = false
    }
  }, [serverId])

  // 내 태그 중 다른 멤버와 겹치는 것 — 상대 행의 common_with_me(나와 겹치는 태그)를
  // 전부 모으면 곧 "내 태그 중 누군가와 통하는 태그" 목록이 된다 (백엔드 수정 불필요)
  const myCommon = [
    ...new Set(
      members
        .filter((m) => m.user_id !== userId)
        .flatMap((m) => m.common_with_me ?? []),
    ),
  ]

  return (
    <div>
      <div className="panel-title">멤버 — {members.length}</div>
      {error && <div className="error">{error}</div>}
      {/* 내가 맨 위 → 그다음 접속 중인 사람 → 나머지.
          내 태그가 어떻게 보이는지 늘 첫 줄에서 확인할 수 있게 나를 고정한다. */}
      {[...members]
        .sort((a, b) => {
          if (a.user_id === userId) return -1
          if (b.user_id === userId) return 1
          return Number(online.has(b.user_id)) - Number(online.has(a.user_id))
        })
        .map((m) => {
        const me = m.user_id === userId
        const isOnline = online.has(m.user_id)
        return (
          <div key={m.user_id} className={`member-row${me ? ' me' : ''}`}>
            <div className="member-avatar-wrap">
              <Avatar userId={m.user_id} name={m.display_name} url={m.avatar_url} size={36} />
              <span className={`presence-dot${isOnline ? ' on' : ''}`} />
            </div>
            <div className="member-info">
              <div className="member-name">
                {m.display_name}
                {me && <span className="muted">(나)</span>}
              </div>
              {/* common_with_me: 내 태그와 겹치는 항목 — TagPills가 하이라이트해서 보여준다.
                  내 행에는 myCommon을 넘겨 "누군가와 통하는 내 태그"도 똑같이 반짝이게 한다 */}
              <TagPills tags={m.tags} common={me ? myCommon : m.common_with_me} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

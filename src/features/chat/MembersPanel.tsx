import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { getMembers, type Member } from '../servers/api'
import { TagPills } from '../users/TagPills'
import { ApiError } from '../../shared/api/client'
import { avatarColor } from '../../shared/lib/colors'

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

  return (
    <div>
      <div className="panel-title">멤버 — {members.length}</div>
      {error && <div className="error">{error}</div>}
      {members.map((m) => {
        const me = m.user_id === userId
        const isOnline = online.has(m.user_id)
        return (
          <div key={m.user_id} className="member-row">
            <div className="member-avatar-wrap">
              <div className="chat-avatar" style={{ background: avatarColor(m.user_id) }}>
                {m.display_name.charAt(0)}
              </div>
              <span className={`presence-dot${isOnline ? ' on' : ''}`} />
            </div>
            <div className="member-info">
              <div className="member-name">
                {m.display_name}
                {me && <span className="muted">(나)</span>}
              </div>
              <TagPills tags={m.tags} common={m.common_with_me} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

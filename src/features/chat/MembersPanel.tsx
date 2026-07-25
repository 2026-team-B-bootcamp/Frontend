/**
 * 채팅 화면 우측 "멤버" 패널 — 현재 서버에 속한 멤버 목록과 각자의 관심사 태그를 보여준다.
 * servers/api.ts의 getMembers로 멤버 목록을 불러오고, 태그 렌더링/겹치는 태그 강조는
 * TagPills 컴포넌트에 위임한다.
 *
 * 여기에 두 개의 방장/온보딩 진입점이 붙어 있다.
 * ① 관심사 통계 다시 보기 — 통계 모달은 태그가 빈 사람에게 입장 시 한 번만 자동으로
 *    뜨는데, 그 뒤로는 "이 모임 사람들이 뭘 좋아하지"를 볼 방법이 없었다.
 * ② 멤버 내보내기 — 모임을 만든 사람에게만 보인다.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { getMembers, kickMember, type Member } from '../servers/api'
import { TagPills } from '../users/TagPills'
import { ApiError } from '../../shared/api/client'
import { Avatar } from '../../shared/ui/Avatar'
import { SparkIcon, UserMinusIcon } from '../../shared/ui/icons'

export function MembersPanel({
  serverId,
  online,
  onOpenTagStats,
}: {
  serverId: number
  online: Set<number>
  // 관심사 통계 모달을 다시 여는 버튼 — 실제로 모달을 띄우는 건 ChatPage다
  onOpenTagStats: () => void
}) {
  const { userId } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)
  // 내보내는 중인 멤버 — 버튼을 잠가 같은 사람에게 두 번 나가지 않게 한다
  const [kicking, setKicking] = useState<number | null>(null)

  const load = useCallback(
    (signal: { active: boolean }) => {
      getMembers(serverId)
        .then((ms) => {
          if (signal.active) setMembers(ms)
        })
        .catch((err) => {
          if (signal.active)
            setError(err instanceof ApiError ? err.message : '멤버를 불러오지 못했습니다')
        })
    },
    [serverId],
  )

  useEffect(() => {
    const signal = { active: true }
    load(signal)
    return () => {
      signal.active = false
    }
  }, [load])

  async function onKick(member: Member) {
    if (
      !window.confirm(
        `${member.display_name}님을 이 모임에서 내보낼까요?\n` +
          '남긴 메시지는 그대로 남고, 초대코드로 다시 들어올 수 있어요.',
      )
    )
      return
    setKicking(member.user_id)
    setError(null)
    try {
      await kickMember(serverId, member.user_id)
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '내보내지 못했습니다')
    } finally {
      setKicking(null)
    }
  }

  // 내 태그 중 다른 멤버와 겹치는 것 — 상대 행의 common_with_me(나와 겹치는 태그)를
  // 전부 모으면 곧 "내 태그 중 누군가와 통하는 태그" 목록이 된다 (백엔드 수정 불필요)
  const myCommon = [
    ...new Set(
      members
        .filter((m) => m.user_id !== userId)
        .flatMap((m) => m.common_with_me ?? []),
    ),
  ]
  // 내보내기 버튼은 방장에게만. 목록의 is_owner가 나를 가리키는지로 판단하므로
  // 서버 정보를 따로 받아올 필요가 없다.
  const amOwner = members.some((m) => m.user_id === userId && m.is_owner)

  return (
    <div>
      <div className="panel-title">멤버 — {members.length}</div>

      {/* 이 모임의 관심사 지형도를 다시 펼쳐보는 자리. 통계 모달은 태그가 비어 있는
          사람에게 한 번만 자동으로 뜨므로, 그 뒤로 볼 방법이 여기 말고는 없다. */}
      <button type="button" className="members-stats-btn" onClick={onOpenTagStats}>
        <SparkIcon size={14} />
        이 모임의 관심사 보기
      </button>

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
        // 방장 자신과 나 자신은 내보낼 수 없다 (백엔드도 같은 규칙으로 막는다)
        const canKick = amOwner && !me && !m.is_owner
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
                {m.is_owner && <span className="member-owner-badge">방장</span>}
              </div>
              {/* common_with_me: 내 태그와 겹치는 항목 — TagPills가 하이라이트해서 보여준다.
                  내 행에는 myCommon을 넘겨 "누군가와 통하는 내 태그"도 똑같이 반짝이게 한다 */}
              <TagPills tags={m.tags} common={me ? myCommon : m.common_with_me} />
            </div>
            {canKick && (
              <button
                type="button"
                className="member-kick"
                onClick={() => onKick(m)}
                disabled={kicking === m.user_id}
                title="모임에서 내보내기"
                aria-label={`${m.display_name}님 내보내기`}
              >
                <UserMinusIcon size={16} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

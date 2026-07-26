/**
 * 내 프로필 패널 — 예전엔 이름 한 줄 + 작은 글자 링크 두 개뿐이라 초라했다.
 * 아바타를 큼직하게 보여주고, 패널 전체를 눌러 프로필을 열 수 있게 했다.
 * 사이드바 색 고르기(SidebarThemePicker)와 로그아웃 버튼도 이 줄에 함께 산다.
 */
import { LogoutIcon } from '../../shared/ui/icons'
import { Avatar } from '../../shared/ui/Avatar'
import { SidebarThemePicker } from './SidebarThemePicker'

export function SidebarMe({
  userId,
  displayName,
  avatarUrl,
  onProfile,
  onLogout,
}: {
  userId: number | null
  displayName: string | null
  avatarUrl: string | null
  onProfile: () => void
  onLogout: () => void
}) {
  return (
    <div className="sidebar-me">
      <button type="button" className="sidebar-me-main" onClick={onProfile} title="프로필 편집">
        <Avatar userId={userId ?? 0} name={displayName ?? '?'} url={avatarUrl} size={38} />
        <span className="sidebar-me-text">
          <span className="sidebar-me-name">{displayName ?? '사용자'}</span>
          <span className="sidebar-me-sub">프로필 편집</span>
        </span>
      </button>
      <SidebarThemePicker />
      <button
        type="button"
        className="sidebar-me-logout"
        onClick={onLogout}
        title="로그아웃"
        aria-label="로그아웃"
      >
        <LogoutIcon size={17} />
      </button>
    </div>
  )
}

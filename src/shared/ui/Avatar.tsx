/**
 * 프로필 아바타 — 업로드한 사진이 있으면 사진을, 없으면 이름 첫 글자를 색 원에 담아 그린다.
 *
 * 예전엔 화면마다 `<div className="chat-avatar">{name.charAt(0)}</div>` 를 직접 그려서
 * 업로드한 프로필 사진이 프로필 편집 모달 안에서만 보이고 멤버 목록·채팅·사이드바에는
 * 전혀 나오지 않았다. 아바타를 한 군데로 모아 어디서든 같은 규칙으로 보이게 한다.
 */
import { avatarColor } from '../lib/colors'
import { resolveAvatarUrl } from '../lib/avatarUrl'

export function Avatar({
  userId,
  name,
  url,
  size = 36,
  className,
}: {
  userId: number
  name: string
  url?: string | null
  size?: number
  className?: string
}) {
  const resolved = resolveAvatarUrl(url)
  return (
    <span
      className={`avatar${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        // 사진이 있으면 배경색은 로딩 중에만 잠깐 보인다
        background: avatarColor(userId),
        // 글자 아바타의 이니셜이 원 크기에 따라 같이 커지도록 비율로 잡는다
        fontSize: Math.round(size * 0.44),
      }}
      aria-hidden="true"
    >
      {resolved ? <img src={resolved} alt="" loading="lazy" /> : name.charAt(0)}
    </span>
  )
}

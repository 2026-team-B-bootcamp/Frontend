/**
 * 폭탄 도화선 — 남은 시간에 비례해 줄어드는 심지 막대 + 💣. 20초 이하면 danger.
 * 끝말잇기·초성퀴즈(폭탄 돌리기류) 공용.
 *
 * ⚠️ 클래스명이 `.cho-*`인 건 초성퀴즈 쪽에서 먼저 만들어졌기 때문이다 — 끝말잇기가
 * 그 스타일을 그대로 물려쓴다. `.fuse-*`로 새로 지으면 CSS(src/styles/chosung.css)까지
 * 원자적으로 고쳐야 하고 시각 리스크만 커지므로, 이름은 그대로 두고 컴포넌트만 뺐다.
 */
export const FUSE_TOTAL = 120

export function Fuse({ seconds }: { seconds: number }) {
  const ratio = Math.max(0, Math.min(1, seconds / FUSE_TOTAL))
  const danger = seconds <= 20
  const mm = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <div className={`cho-fuse${danger ? ' danger' : ''}`}>
      <span className="cho-bomb" aria-hidden>
        💣
      </span>
      <div className="cho-fuse-track">
        <div className="cho-fuse-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="cho-fuse-time">
        {mm}:{ss}
      </span>
    </div>
  )
}

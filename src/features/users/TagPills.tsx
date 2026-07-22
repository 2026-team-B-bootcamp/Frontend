// 태그 문자열을 팩 3색(라임·코랄·스카이) 중 하나로 결정적으로 매핑해 솔리드 칩으로 렌더링.
// 같은 태그는 어디서든 같은 색 → 화면 전체에서 태그가 시각적으로 이어져 보인다.
// 겹치는(common) 태그는 별표 대신 잉크 테두리 + 펄스 애니메이션으로 강조한다.
const TAG_COLORS = ['#c7e86b', '#ff8b6a', '#8fc9f0']

function colorFor(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0
  return TAG_COLORS[h % TAG_COLORS.length]
}

// tags: 보여줄 태그 목록, common: 그중 "나와 겹치는" 태그 (있으면 강조 스타일 적용)
export function TagPills({
  tags,
  common,
}: {
  tags: string[]
  common?: string[]
}) {
  const commonSet = new Set(common ?? [])
  const shown = tags.filter((t) => t && t.trim().length > 0)
  if (shown.length === 0) {
    return <span className="muted">태그 미설정</span>
  }
  return (
    <div className="pills">
      {shown.map((tag, i) => {
        const isCommon = commonSet.has(tag)
        return (
          <span
            key={`${tag}-${i}`}
            className={isCommon ? 'pill common' : 'pill'}
            style={{ background: colorFor(tag), color: '#191a23' }}
          >
            {tag}
          </span>
        )
      })}
    </div>
  )
}

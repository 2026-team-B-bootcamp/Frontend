// 태그 문자열에서 결정적으로 색상(hue)을 뽑아 파스텔 필로 렌더링.
// 같은 태그는 어디서든 같은 색 → 화면 전체에서 태그가 시각적으로 이어져 보인다.
const HUES = [16, 40, 88, 145, 180, 210, 255, 300, 330]

function hueFor(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0
  return HUES[h % HUES.length]
}

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
        const h = hueFor(tag)
        return (
          <span
            key={`${tag}-${i}`}
            className={isCommon ? 'pill common' : 'pill'}
            style={
              isCommon
                ? undefined
                : {
                    background: `hsl(${h} 62% 94%)`,
                    borderColor: `hsl(${h} 45% 83%)`,
                    color: `hsl(${h} 52% 33%)`,
                  }
            }
          >
            {tag}
            {isCommon && ' ✦'}
          </span>
        )
      })}
    </div>
  )
}

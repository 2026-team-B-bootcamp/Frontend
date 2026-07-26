/**
 * 이름을 그 자리에서 고치는 한 줄 입력.
 *
 * 이름 바꾸기 때문에 모달을 띄우지 않는다 — 서버 이름도 채널 이름도 이미 화면에
 * 글자로 있으니, 같은 자리에서 글자만 입력칸으로 바뀌는 편이 훨씬 덜 거슬린다.
 * Enter로 저장 / Esc로 취소 / 포커스를 잃으면 저장(누르러 간 곳이 다른 버튼이어도
 * 적어둔 것이 날아가지 않게).
 */
import { useState } from 'react'

export function InlineRename({
  initial,
  onSubmit,
  onCancel,
  className,
  ariaLabel,
}: {
  initial: string
  onSubmit: (name: string) => void
  onCancel: () => void
  className: string
  ariaLabel: string
}) {
  const [value, setValue] = useState(initial)

  function commit() {
    const name = value.trim()
    // 빈 이름이나 그대로인 이름은 저장할 게 없다 — 조용히 닫는다.
    if (!name || name === initial) onCancel()
    else onSubmit(name)
  }

  return (
    <input
      className={className}
      aria-label={ariaLabel}
      value={value}
      maxLength={100}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      // 채널 행에서는 이 입력이 Link 안에 있지 않지만, 부모의 클릭 핸들러
      // (드로어 닫기 등)까지 번지면 편집 중에 화면이 바뀐다.
      onClick={(e) => e.stopPropagation()}
    />
  )
}

/** 초성퀴즈 미니게임 선택 카드용 미리보기 그림 — 초성 'ㅅㄱ' + 작은 폭탄. */

export function ChosungPreview() {
  return (
    <svg viewBox="0 0 40 40" className="game-preview-svg">
      {/* 초성 알약 */}
      <rect
        x={2}
        y={13}
        width={22}
        height={14}
        rx={7}
        fill="var(--accent-bg)"
        stroke="var(--accent-border)"
      />
      <text x={13} y={23} textAnchor="middle" className="game-preview-text accent">
        ㅅㄱ
      </text>
      {/* 폭탄 */}
      <circle cx={30} cy={24} r={6.5} fill="var(--text-h)" />
      <path
        d="M33 18l2-3"
        stroke="var(--text-faint)"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <circle cx={35.6} cy={14.6} r={1.6} fill="var(--coral)" />
    </svg>
  )
}

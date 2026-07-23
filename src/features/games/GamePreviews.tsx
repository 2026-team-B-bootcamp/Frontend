/** 미니게임 선택 카드용 작은 미리보기 그림 — 각 게임의 생김새를 그대로 축소해 보여준다. */

export function BingoPreview() {
  const marked = new Set([0, 4, 8])
  return (
    <svg viewBox="0 0 40 40" className="game-preview-svg">
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        return (
          <rect
            key={i}
            x={3 + col * 12}
            y={3 + row * 12}
            width={10}
            height={10}
            rx={2}
            fill={marked.has(i) ? 'var(--accent)' : 'var(--surface)'}
            stroke={marked.has(i) ? 'var(--accent)' : 'var(--border)'}
          />
        )
      })}
    </svg>
  )
}

export function WordChainPreview() {
  return (
    <svg viewBox="0 0 40 40" className="game-preview-svg">
      <rect x={2} y={14} width={16} height={12} rx={6} fill="var(--surface)" stroke="var(--border)" />
      <text x={10} y={22.5} textAnchor="middle" className="game-preview-text">
        나
      </text>
      <rect x={22} y={14} width={16} height={12} rx={6} fill="var(--accent-bg)" stroke="var(--accent-border)" />
      <text x={30} y={22.5} textAnchor="middle" className="game-preview-text accent">
        무
      </text>
      <path d="M18 20h4" stroke="var(--text-faint)" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

export function OmokPreview() {
  const lines = [10, 20, 30]
  return (
    <svg viewBox="0 0 40 40" className="game-preview-svg">
      {lines.map((p) => (
        <line key={`h${p}`} x1={10} y1={p} x2={30} y2={p} stroke="var(--border-bright)" strokeWidth={1.4} />
      ))}
      {lines.map((p) => (
        <line key={`v${p}`} x1={p} y1={10} x2={p} y2={30} stroke="var(--border-bright)" strokeWidth={1.4} />
      ))}
      <circle cx={20} cy={20} r={4.5} fill="var(--text-h)" />
      <circle cx={30} cy={10} r={4.5} fill="var(--surface)" stroke="var(--border-bright)" strokeWidth={1.2} />
      <circle cx={10} cy={30} r={4.5} fill="var(--accent)" />
    </svg>
  )
}

export function BalancePreview() {
  return (
    <svg viewBox="0 0 40 40" className="game-preview-svg">
      <rect x={4} y={8} width={15} height={24} rx={4} fill="var(--accent-bg)" stroke="var(--accent-border)" />
      <rect x={21} y={8} width={15} height={24} rx={4} fill="var(--sky-bg)" stroke="var(--sky-border)" />
      <text x={11.5} y={23} textAnchor="middle" className="game-preview-text accent">
        A
      </text>
      <text x={28.5} y={23} textAnchor="middle" className="game-preview-text" fill="var(--sky-text)">
        B
      </text>
    </svg>
  )
}

export function TicTacToePreview() {
  return (
    <svg viewBox="0 0 40 40" className="game-preview-svg">
      <line x1={16} y1={5} x2={16} y2={35} stroke="var(--border-bright)" strokeWidth={2} />
      <line x1={26} y1={5} x2={26} y2={35} stroke="var(--border-bright)" strokeWidth={2} />
      <line x1={5} y1={16} x2={35} y2={16} stroke="var(--border-bright)" strokeWidth={2} />
      <line x1={5} y1={26} x2={35} y2={26} stroke="var(--border-bright)" strokeWidth={2} />
      {/* X (좌상) */}
      <path d="M7 7l4 4M11 7l-4 4" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" />
      {/* O (우중) */}
      <circle cx={31} cy={21} r={3.4} fill="none" stroke="var(--sky)" strokeWidth={2} />
    </svg>
  )
}

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

export function WheelPreview() {
  const colors = ['#e8622c', '#d9a13c', '#c14e1a', '#8a6410']
  const parts = colors.map((c, i) => {
    const start = (i * 360) / colors.length
    const end = ((i + 1) * 360) / colors.length
    const toRad = (d: number) => (d * Math.PI) / 180
    const cx = 20
    const cy = 20
    const r = 16
    const x1 = cx + r * Math.sin(toRad(start))
    const y1 = cy - r * Math.cos(toRad(start))
    const x2 = cx + r * Math.sin(toRad(end))
    const y2 = cy - r * Math.cos(toRad(end))
    return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`} fill={c} />
  })
  return (
    <svg viewBox="0 0 40 40" className="game-preview-svg">
      {parts}
      <circle cx={20} cy={20} r={4} fill="var(--surface)" stroke="var(--border-bright)" />
      <path d="M20 1.5 16.5 7h7z" fill="var(--text-h)" />
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

export function LadderPreview() {
  return (
    <svg viewBox="0 0 40 40" className="game-preview-svg">
      <line x1={8} y1={4} x2={8} y2={36} stroke="var(--border-bright)" strokeWidth={2} />
      <line x1={20} y1={4} x2={20} y2={36} stroke="var(--border-bright)" strokeWidth={2} />
      <line x1={32} y1={4} x2={32} y2={36} stroke="var(--border-bright)" strokeWidth={2} />
      <line x1={8} y1={13} x2={20} y2={13} stroke="var(--accent-2)" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={20} y1={25} x2={32} y2={25} stroke="var(--accent-2)" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={8} cy={4} r={2.5} fill="var(--accent)" />
    </svg>
  )
}

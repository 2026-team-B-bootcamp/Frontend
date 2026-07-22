// 앱 전역에서 재사용하는 SVG 라인 아이콘 모음. 로직 없이 순수 UI 컴포넌트라
// 여러 feature 화면(랜딩, 채팅, 게임 등)에서 import해서 그대로 쓴다.
import type { SVGProps } from 'react'

// web-warm-workspace 팩: 이모지 대신 1.5px stroke 단색 라인 아이콘 사용
function base(size: number): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
}

export function UsersIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 20c.6-3.4 2.8-5.5 5.5-5.5s4.9 2.1 5.5 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.8 14.9c2.2.4 4 2.1 4.6 5.1" />
    </svg>
  )
}

export function DiceIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SlidersIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h9.5M18.5 7H20" />
      <circle cx="16.2" cy="7" r="1.8" />
      <path d="M4 12h2.5M9.5 12H20" />
      <circle cx="7.2" cy="12" r="1.8" />
      <path d="M4 17h9.5M18.5 17H20" />
      <circle cx="16.2" cy="17" r="1.8" />
    </svg>
  )
}

export function PlusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function ChainIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.8 13 4.8a3.4 3.4 0 0 1 4.8 0l1.4 1.4a3.4 3.4 0 0 1 0 4.8l-2 2" />
      <path d="M13 17.2 11 19.2a3.4 3.4 0 0 1-4.8 0l-1.4-1.4a3.4 3.4 0 0 1 0-4.8l2-2" />
    </svg>
  )
}

export function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5" />
    </svg>
  )
}

// AI 기능 전용 아이콘 — 다른 아이콘들과 달리 Gemini풍 보라→파랑 그라디언트
// 4각 별(fill) 형태를 쓴다. "이건 AI 기능"이라는 시각 신호를 통일하기 위함.
export function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id="ai-spark-grad"
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#9168C0" />
          <stop offset="0.55" stopColor="#5684D1" />
          <stop offset="1" stopColor="#1BA1E3" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5C12.65 7.4 15.5 10.55 22.5 12C15.5 13.45 12.65 16.6 12 22.5C11.35 16.6 8.5 13.45 1.5 12C8.5 10.55 11.35 7.4 12 1.5Z"
        fill="url(#ai-spark-grad)"
      />
    </svg>
  )
}

export function WheelIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5V12l7.36 4.25M12 12 4.64 16.25M12 12 12 20.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function LadderIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M7 3.5v17M17 3.5v17" />
      <path d="M7 8h10M7 13h10M7 18h10" />
    </svg>
  )
}

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

export function MenuIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
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

export function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

// ---- 채팅 서식 툴바 아이콘 ----

export function BoldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
    </svg>
  )
}

export function ItalicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M15 5h-5M14 19H9M14.5 5 9.5 19" />
    </svg>
  )
}

export function StrikeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M5 12h14" />
      <path d="M8 8.5a3.5 2.5 0 0 1 6-1.5M8 15a3.5 2.8 0 0 0 6 1.2" />
    </svg>
  )
}

export function CodeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M9 8 5 12l4 4M15 8l4 4-4 4" />
    </svg>
  )
}

export function EmojiIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TvIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="7" width="18" height="12" rx="2.5" />
      <path d="M8 3.5 12 7l4-3.5" />
      <path d="M10 10.5v5l4-2.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PaletteIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.9-1 1.9-2 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H16a4.5 4.5 0 0 0 4.5-4.5C20.5 6.6 16.7 3.5 12 3.5Z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function GifIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M9.5 10.2a2 2 0 1 0 0 3.6c1 0 1.6-.5 1.6-1.5v-.4H9.7" />
      <path d="M13.6 9.9v4.2M16 14.1V9.9h2.4M16 12h1.9" />
    </svg>
  )
}

// 메시지 삭제 등 "지우기" 동작에 쓰는 휴지통 아이콘
export function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M10 4h4M9 7v11m6-11v11M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 사이드바 하단 로그아웃 버튼용 — 문(door)에서 화살표가 나가는 형태
export function LogoutIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 4h3.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 8.5 6.5 12 10 15.5M6.5 12H15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

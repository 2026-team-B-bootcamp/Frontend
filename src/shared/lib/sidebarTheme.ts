/**
 * 좌측 프레임(서버 레일 + 채널 사이드바)의 색 테마.
 *
 * 앱 전체가 아니라 왼쪽 프레임만 갈아끼운다 — 채팅 본문·게임·모달은 이리데센트
 * 팩의 화이트 캔버스를 그대로 두고, 슬랙처럼 "사이드바 색만 고르는" 방식이다.
 * 그래서 다크 테마를 골라도 대화 내용의 가독성은 건드리지 않는다.
 *
 * 색 값 자체는 styles/tokens.css의 [data-sidebar-theme="..."] 블록에 있고,
 * 이 파일은 "어떤 테마가 있는지 + 지금 무엇이 골라졌는지"만 안다.
 * 미리보기 스와치를 그려야 해서 대표색 두 개(rail/side)만 여기 중복해 둔다.
 */

export interface SidebarTheme {
  key: string
  label: string
  // 스와치용 대표 2색 — 실제 적용 색은 CSS 변수가 가진다
  rail: string
  side: string
}

export const SIDEBAR_THEMES: SidebarTheme[] = [
  { key: 'ivory', label: '아이보리', rail: '#e0d5bd', side: '#f7f2e6' },
  { key: 'sky', label: '스카이', rail: '#5fa8dd', side: '#8fc9f0' },
  { key: 'lavender', label: '라벤더', rail: '#9b8dd6', side: '#d9d2f4' },
  { key: 'mint', label: '민트', rail: '#66b499', side: '#c9e9dc' },
  { key: 'dark', label: '다크', rail: '#1b1c23', side: '#2a2c36' },
]

export const DEFAULT_SIDEBAR_THEME = 'ivory'

const STORAGE_KEY = 'sidebar_theme'

function isKnown(key: string | null): key is string {
  return key !== null && SIDEBAR_THEMES.some((t) => t.key === key)
}

export function getSidebarTheme(): string {
  // 저장된 값이 목록에 없으면(테마를 지웠거나 손으로 고쳤거나) 기본값으로 되돌린다 —
  // 모르는 키를 그대로 붙이면 어떤 테마 블록도 안 맞아 색이 통째로 비어버린다.
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return isKnown(saved) ? saved : DEFAULT_SIDEBAR_THEME
  } catch {
    // 시크릿 모드 등에서 localStorage 접근이 막힐 수 있다
    return DEFAULT_SIDEBAR_THEME
  }
}

export function applySidebarTheme(key: string): void {
  const next = isKnown(key) ? key : DEFAULT_SIDEBAR_THEME
  document.documentElement.dataset.sidebarTheme = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 저장만 실패한 것이므로 이번 세션의 적용은 그대로 둔다
  }
}

/**
 * 앱이 그려지기 전에 저장된 테마를 붙인다.
 *
 * React 안(useEffect)에서 하면 첫 페인트가 기본 테마로 한 번 나갔다가 바뀌어
 * 눈에 띄게 깜빡인다. main.tsx가 render 전에 이걸 부른다.
 */
export function initSidebarTheme(): void {
  document.documentElement.dataset.sidebarTheme = getSidebarTheme()
}

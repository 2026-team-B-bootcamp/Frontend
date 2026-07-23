/**
 * CSS 미디어쿼리를 JS에서도 구독하는 훅.
 * 반응형 레이아웃 대부분은 CSS로 처리하지만, "모바일에서는 멤버 패널을 기본으로 닫는다"처럼
 * 컴포넌트의 초기 상태·동작 자체가 달라져야 하는 경우엔 이 훅으로 화면 폭을 읽는다.
 */
import { useEffect, useState } from 'react'

// 채팅 셸이 모바일 레이아웃(드로어)으로 바뀌는 기준 — chat.css의 미디어쿼리와 같은 값
export const MOBILE_QUERY = '(max-width: 720px)'
// 멤버 사이드 패널이 레이아웃의 한 칸에서 오버레이로 바뀌는 기준 — panel.css와 같은 값
export const PANEL_OVERLAY_QUERY = '(max-width: 900px)'

export function useMediaQuery(query: string) {
  // 초기값도 실제 화면 폭에서 읽는다 — 첫 렌더에서 패널이 잠깐 열렸다 닫히는 깜빡임 방지
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY)
}

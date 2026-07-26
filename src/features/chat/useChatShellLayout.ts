// 채팅 셸의 반응형 레이아웃 상태 — 드로어(모바일 네비게이션), 멤버 패널, 미니게임류
// 패널(미니게임 PIP·함께 보기·그림판)의 열림/닫힘을 한 곳에 모은다.
// ChatPage와 ChatHeader가 함께 읽고 쓴다.
import { useEffect, useState } from 'react'
import { PANEL_OVERLAY_QUERY, useIsMobile, useMediaQuery } from '../../shared/lib/useMediaQuery'

export function useChatShellLayout() {
  // 좁은 화면에서는 레일·사이드바가 드로어로(≤720px), 멤버 패널이 오버레이로(≤900px) 바뀐다
  const isMobile = useIsMobile()
  const panelIsOverlay = useMediaQuery(PANEL_OVERLAY_QUERY)
  // 드로어는 모바일에서만 존재한다 — 넓은 화면으로 돌아가면 열림 상태를 무시한다
  // (state를 되돌리는 대신 파생값으로 계산해 effect 없이 정리한다)
  const [navRequested, setNavRequested] = useState(false)
  const navOpen = navRequested && isMobile
  const closeNav = () => setNavRequested(false)
  // 멤버 사이드 패널과 미니게임 PIP는 서로 독립적으로 열고 닫는다.
  // 패널이 오버레이로 뜨는 폭에선 채팅을 가리므로 기본은 닫힌 상태로 시작한다.
  const [showMembers, setShowMembers] = useState(
    () => !window.matchMedia(PANEL_OVERLAY_QUERY).matches,
  )
  const [gameOpen, setGameOpen] = useState(false)
  const [watchOpen, setWatchOpen] = useState(false)
  const [drawOpen, setDrawOpen] = useState(false)

  // 열려 있는 오버레이(드로어/멤버 패널)는 Esc로 닫는다
  useEffect(() => {
    if (!navOpen && !(panelIsOverlay && showMembers)) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (navOpen) setNavRequested(false)
      else setShowMembers(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen, panelIsOverlay, showMembers])

  return {
    isMobile,
    panelIsOverlay,
    navRequested,
    setNavRequested,
    navOpen,
    closeNav,
    showMembers,
    setShowMembers,
    gameOpen,
    setGameOpen,
    watchOpen,
    setWatchOpen,
    drawOpen,
    setDrawOpen,
  }
}

/**
 * 사이드바 색 테마를 고르는 작은 팝오버 — 채널 사이드바 하단(내 프로필 줄)에 붙는다.
 *
 * 다크모드 토글과 같은 자리·같은 감각이지만 앱 전체가 아니라 왼쪽 프레임만 바꾼다.
 * 색 값과 저장은 shared/lib/sidebarTheme.ts가 갖고 있고, 여기는 고르는 UI만 맡는다.
 */
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PaletteIcon } from '../../shared/ui/icons'
import {
  SIDEBAR_THEMES,
  applySidebarTheme,
  getSidebarTheme,
} from '../../shared/lib/sidebarTheme'
import { useDismissOnOutside } from '../../shared/lib/useDismissOnOutside'

export function SidebarThemePicker() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(getSidebarTheme)
  const rootRef = useRef<HTMLDivElement>(null)

  // 바깥을 누르거나 Esc를 누르면 닫는다 — 팝오버가 열린 채로 남아 채널 목록을 가리지 않게.
  useDismissOnOutside(rootRef, open, () => setOpen(false))

  function pick(key: string) {
    applySidebarTheme(key)
    setTheme(key)
    setOpen(false)
  }

  return (
    <div className="sidebar-theme" ref={rootRef}>
      <button
        type="button"
        className={`sidebar-theme-btn${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="사이드바 색"
        aria-label="사이드바 색 고르기"
        aria-expanded={open}
      >
        <PaletteIcon size={17} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="sidebar-theme-pop"
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {SIDEBAR_THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                role="menuitemradio"
                aria-checked={t.key === theme}
                className={`sidebar-theme-opt${t.key === theme ? ' active' : ''}`}
                onClick={() => pick(t.key)}
              >
                {/* 레일색과 사이드바색을 반씩 — 고르기 전에 실제 조합이 보인다 */}
                <span
                  className="sidebar-theme-swatch"
                  style={{ background: `linear-gradient(135deg, ${t.rail} 50%, ${t.side} 50%)` }}
                />
                {t.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

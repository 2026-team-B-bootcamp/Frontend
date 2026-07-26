// 바깥을 누르거나 Esc를 누르면 닫는다 — 열어둔 팝오버·메뉴가 다른 조작을 가리거나,
// 열어둔 채로 다른 곳을 만지다가 파괴적 항목을 실수로 누르는 일이 없게 한다.
import { useEffect, type RefObject } from 'react'

export function useDismissOnOutside(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, open, onClose])
}

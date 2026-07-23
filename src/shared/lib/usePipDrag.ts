/**
 * 떠다니는 PIP 창(미니게임·함께보기·그림판)이 기준면(채팅 본문) 밖으로 나가지 않게
 * 잡아주는 훅.
 *
 * 예전엔 motion의 dragConstraints에 기준면 ref를 그대로 넘겼는데, motion은 경계를
 * "드래그를 시작하는 순간"에 한 번만 재는 탓에 (1) 창을 리사이즈하거나 (2) 브라우저
 * 창이 작아지면 이미 밖으로 나간 위치가 그대로 남아 창이 화면 밖으로 사라졌다.
 *
 * 여기서는 경계를 숫자로 직접 계산해서 넘기고, 크기·기준면이 바뀔 때마다 현재 위치(x/y)를
 * 그 경계 안으로 즉시 되돌린다. 측정에는 getBoundingClientRect 대신 offsetLeft·clientWidth 류를 쓴다 —
 * 등장 애니메이션(scale 0.9)의 transform이 섞이지 않는 레이아웃 값이라야 정확하다.
 */
import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { useMotionValue } from 'motion/react'

// 기준면 가장자리에서 최소한 남겨둘 여백(px) — 창의 모서리가 잘려 안 보이는 것을 막는다
const EDGE_MARGIN = 8

export interface PipBounds {
  top: number
  left: number
  right: number
  bottom: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export function usePipDrag(
  pipRef: RefObject<HTMLElement | null>,
  containerRef: RefObject<HTMLElement | null>,
  // 모바일에선 PIP가 하단 시트라 드래그 자체가 없다 — 측정도 하지 않는다
  enabled: boolean,
) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [bounds, setBounds] = useState<PipBounds>({ top: 0, left: 0, right: 0, bottom: 0 })

  const measure = useCallback(() => {
    const pip = pipRef.current
    const container = containerRef.current
    if (!pip || !container) return
    // offsetLeft/Top은 transform 이전의 "CSS가 정한 자리"다. 거기서 얼마나 밀 수 있는지가 곧 경계.
    const left0 = pip.offsetLeft
    const top0 = pip.offsetTop
    const w = pip.offsetWidth
    const h = pip.offsetHeight
    const minX = EDGE_MARGIN - left0
    const minY = EDGE_MARGIN - top0
    // 창이 기준면보다 크면 min > max가 될 수 있다 — 그땐 min으로 눌러 좌상단을 우선 보이게 한다
    const maxX = Math.max(minX, container.clientWidth - EDGE_MARGIN - (left0 + w))
    const maxY = Math.max(minY, container.clientHeight - EDGE_MARGIN - (top0 + h))
    setBounds({ left: minX, right: maxX, top: minY, bottom: maxY })
    // 이미 밖에 있던 위치는 즉시 안으로 되돌린다 (motion은 다음 드래그 전까지 스스로 보정하지 않는다)
    x.set(clamp(x.get(), minX, maxX))
    y.set(clamp(y.get(), minY, maxY))
  }, [pipRef, containerRef, x, y])

  useLayoutEffect(() => {
    if (!enabled) {
      // 하단 시트로 바뀔 땐 남아 있던 드래그 오프셋을 지운다 — 안 그러면 시트가 비뚤게 뜬다
      x.set(0)
      y.set(0)
      return
    }
    measure()
  }, [enabled, measure, x, y])

  // 창 크기 변경(리사이즈 핸들·게임 전환)과 뷰포트 변화 모두를 잡는다
  useEffect(() => {
    if (!enabled) return
    const pip = pipRef.current
    const container = containerRef.current
    if (!pip || !container) return
    const ro = new ResizeObserver(measure)
    ro.observe(pip)
    ro.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [enabled, measure, pipRef, containerRef])

  return { x, y, dragConstraints: bounds }
}

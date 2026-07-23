/**
 * 공유 그림판 PIP — 채널의 모두가 같은 캔버스에 실시간으로 그린다.
 * 내가 그린 획은 그리는 즉시 로컬 캔버스에 나타나고, pointerup 시점에 백엔드(draw API)로
 * 보내면 서버가 저장하고 채널 전체에 방송한다. 반대로 draw.stroke 이벤트를 받으면
 * 그 획을 캔버스에 덧그린다. 좌표는 캔버스 크기와 무관하게 0..1로 정규화해 주고받으므로
 * 접속자마다 창 크기가 달라도 같은 지점에 그려진다.
 */
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { motion, useDragControls } from 'motion/react'
import { clearDraw, getDraw, sendStroke, type Stroke } from './api'
import { CloseIcon } from '../../shared/ui/icons'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'

// 팔레트: 이리데센트 3색 파스텔 + 기본 잉크 + 화이트(지우개 대용)
const COLORS = ['#2a2a33', '#ff8b6a', '#8fc9f0', '#c7e86b', '#c9a7f0', '#ffffff']
const WIDTHS = [2, 4, 8]

const MIN_W = 260
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const maxW = () => Math.max(MIN_W, window.innerWidth - 40)

export function Whiteboard({
  channelId,
  subscribe,
  onClose,
  constraintsRef,
}: {
  channelId: number
  subscribe: Subscribe
  onClose: () => void
  constraintsRef: RefObject<HTMLElement | null>
}) {
  const [width, setWidth] = useState(() => clamp(340, MIN_W, maxW()))
  const [color, setColor] = useState(COLORS[0])
  const [brush, setBrush] = useState(WIDTHS[1])
  const dragControls = useDragControls()
  const resizeRef = useRef<{ x: number; w: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // 지금까지 그려진 모든 획 — 캔버스 리사이즈 시 전체를 다시 그리는 데 쓴다
  const strokesRef = useRef<Stroke[]>([])
  // 그리는 도중인 현재 획의 정규화 좌표들
  const drawingRef = useRef<number[][] | null>(null)
  // 콜백들이 항상 최신 색/굵기를 읽도록 ref에 미러링
  const colorRef = useRef(color)
  const brushRef = useRef(brush)
  useEffect(() => {
    colorRef.current = color
  }, [color])
  useEffect(() => {
    brushRef.current = brush
  }, [brush])

  // 정규화(0..1) 좌표로 이뤄진 획 하나를 캔버스에 그린다(현재 픽셀 크기 기준)
  function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
    if (s.points.length === 0) return
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const [x0, y0] = s.points[0]
    ctx.moveTo(x0 * w, y0 * h)
    if (s.points.length === 1) {
      // 점 하나만 찍힌 경우 — 작은 원처럼 보이게 살짝 이어 그린다
      ctx.lineTo(x0 * w + 0.01, y0 * h + 0.01)
    } else {
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i][0] * w, s.points[i][1] * h)
      }
    }
    ctx.stroke()
  }

  // 캔버스 픽셀 크기(devicePixelRatio 반영)를 화면 크기에 맞추고 전체 획을 다시 그린다
  function resizeAndRedraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rect.width, rect.height)
    for (const s of strokesRef.current) paintStroke(ctx, s, rect.width, rect.height)
  }

  // 마운트 시 지금까지의 획을 불러와 그린다 + 실시간 구독. 재연결 시 다시 조회한다.
  useEffect(() => {
    let alive = true
    getDraw(channelId)
      .then((res) => {
        if (!alive) return
        strokesRef.current = res.strokes
        resizeAndRedraw()
      })
      .catch(() => {})
    const off = subscribe((e) => {
      if (e.type === 'draw.stroke') {
        const s = e.payload as unknown as Stroke
        strokesRef.current.push(s)
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
          const rect = canvas.getBoundingClientRect()
          paintStroke(ctx, s, rect.width, rect.height)
        }
      } else if (e.type === 'draw.clear') {
        strokesRef.current = []
        resizeAndRedraw()
      } else if (e.type === 'ws.open') {
        getDraw(channelId)
          .then((res) => {
            strokesRef.current = res.strokes
            resizeAndRedraw()
          })
          .catch(() => {})
      }
    })
    return () => {
      alive = false
      off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, subscribe])

  // 창 폭(리사이즈)이 바뀌면 캔버스 픽셀 크기를 다시 맞추고 전체를 다시 그린다
  useEffect(() => {
    resizeAndRedraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  // 뷰포트가 줄면 창 폭도 경계 안으로 다시 맞춘다
  useEffect(() => {
    function onWinResize() {
      setWidth((cur) => clamp(cur, MIN_W, maxW()))
    }
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [])

  // 왼쪽 위 핸들로 가로 크기 조절 (오른쪽 아래가 앵커)
  function onResizeStart(e: ReactPointerEvent) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { x: e.clientX, w: width }
  }
  function onResizeMove(e: ReactPointerEvent) {
    const s = resizeRef.current
    if (!s) return
    setWidth(clamp(s.w + (s.x - e.clientX), MIN_W, maxW()))
  }
  function onResizeEnd(e: ReactPointerEvent) {
    resizeRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // 캔버스 위 포인터 좌표를 0..1로 정규화한다
  function normPoint(e: ReactPointerEvent): [number, number] {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return [
      clamp((e.clientX - rect.left) / rect.width, 0, 1),
      clamp((e.clientY - rect.top) / rect.height, 0, 1),
    ]
  }

  function onDrawStart(e: ReactPointerEvent) {
    e.preventDefault()
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    drawingRef.current = [normPoint(e)]
  }

  function onDrawMove(e: ReactPointerEvent) {
    const pts = drawingRef.current
    if (!pts) return
    const p = normPoint(e)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      // 방금 지나온 구간만 이어 그려 실시간 체감을 준다
      const rect = canvas.getBoundingClientRect()
      const prev = pts[pts.length - 1]
      ctx.strokeStyle = colorRef.current
      ctx.lineWidth = brushRef.current
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(prev[0] * rect.width, prev[1] * rect.height)
      ctx.lineTo(p[0] * rect.width, p[1] * rect.height)
      ctx.stroke()
    }
    pts.push(p)
  }

  function onDrawEnd(e: ReactPointerEvent) {
    const pts = drawingRef.current
    drawingRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (!pts || pts.length === 0) return
    const stroke = { points: pts, color: colorRef.current, width: brushRef.current }
    // 로컬 기록에 남겨 리사이즈 시에도 다시 그려지게 한다(방송 에코는 무시해도 무방)
    strokesRef.current.push({ ...stroke, user_id: -1 })
    void sendStroke(channelId, stroke).catch(() => {})
  }

  function onClear() {
    strokesRef.current = []
    resizeAndRedraw()
    void clearDraw(channelId).catch(() => {})
  }

  return (
    <motion.div
      className="wb-pip"
      style={{ width }}
      drag
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* 왼쪽 위 리사이즈 핸들 — 게임 PIP와 동일한 그립 스타일 재사용 */}
      <div
        className="game-pip-resize"
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
        title="크기 조절"
      />

      <div className="wb-head" onPointerDown={(e) => dragControls.start(e)}>
        <span className="wb-title">🎨 공유 그림판</span>
        <button className="wb-close" onClick={onClose} title="닫기">
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="wb-body">
        <div className="wb-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="wb-canvas"
            onPointerDown={onDrawStart}
            onPointerMove={onDrawMove}
            onPointerUp={onDrawEnd}
            onPointerCancel={onDrawEnd}
          />
        </div>

        <div className="wb-toolbar">
          <div className="wb-swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`wb-swatch${c === color ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
          <div className="wb-widths">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                className={`wb-width${w === brush ? ' active' : ''}`}
                onClick={() => setBrush(w)}
                title={`굵기 ${w}`}
              >
                <span className="wb-width-dot" style={{ width: w + 3, height: w + 3 }} />
              </button>
            ))}
          </div>
          <button type="button" className="wb-clear" onClick={onClear}>
            전체 지우기
          </button>
        </div>
      </div>
    </motion.div>
  )
}

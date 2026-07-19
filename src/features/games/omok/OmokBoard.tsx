/**
 * 오목판을 그리기만 하는 컴포넌트 — 서버 통신은 하지 않는다.
 * 칸 클릭 시 좌표만 onPlace로 부모(OmokPanel)에 알리고,
 * 실제 착수 요청·턴 관리·상태 갱신은 OmokPanel이 담당한다.
 */
import { BLACK } from './api'

// 15x15 판에서 화점(전통적으로 점이 찍히는 기준 좌표) 표시용
const STAR_POINTS = new Set(['3,3', '3,11', '11,3', '11,11', '7,7'])

export function OmokBoard({
  board,
  winningLine,
  lastMove,
  onPlace,
  disabled,
}: {
  board: number[][]
  winningLine: number[][] | null
  lastMove: number[] | null
  onPlace: (row: number, col: number) => void
  disabled: boolean
}) {
  // 승리로 이어진 5개 돌의 좌표를 좌표 문자열 Set으로 변환 — 해당 돌에 'win' 스타일을 입히기 위함
  const winSet = new Set((winningLine ?? []).map(([r, c]) => `${r},${c}`))

  return (
    <div className="omok-board">
      {board.map((rowArr, r) =>
        rowArr.map((cell, c) => {
          const key = `${r},${c}`
          const filled = cell !== 0
          const classes = ['omok-cell']
          if (r === 0) classes.push('edge-top')
          if (r === board.length - 1) classes.push('edge-bottom')
          if (c === 0) classes.push('edge-left')
          if (c === rowArr.length - 1) classes.push('edge-right')
          return (
            <button
              key={key}
              className={classes.join(' ')}
              disabled={disabled || filled}
              onClick={() => onPlace(r, c)}
              aria-label={`${r + 1}행 ${c + 1}열`}
            >
              {filled ? (
                // 돌이 놓인 칸: 색(흑/백) + 승리 줄 여부(win) + 마지막 착수 여부(last)에 따라 스타일 조합
                <span
                  className={
                    'omok-stone' +
                    (cell === BLACK ? ' black' : ' white') +
                    (winSet.has(key) ? ' win' : '') +
                    (lastMove && lastMove[0] === r && lastMove[1] === c ? ' last' : '')
                  }
                />
              ) : STAR_POINTS.has(key) ? (
                <span className="omok-star" />
              ) : null}
            </button>
          )
        }),
      )}
    </div>
  )
}

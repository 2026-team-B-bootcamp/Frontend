/**
 * 틱택토 3×3 판을 그리는 순수 UI 컴포넌트. 상태 관리는 TicTacToePanel이 하고,
 * 여기서는 board 배열을 받아 X/O를 그리고 빈 칸 클릭을 onPlace로 올린다.
 * 승리 줄(winningLine)과 마지막 착수(lastMove)를 시각적으로 강조한다.
 */
import { X } from './api'

export function TicTacToeBoard({
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
  const winSet = new Set((winningLine ?? []).map(([r, c]) => `${r},${c}`))

  return (
    <div className="ttt-board">
      {board.map((rowArr, r) =>
        rowArr.map((cell, c) => {
          const isWin = winSet.has(`${r},${c}`)
          const isLast = lastMove?.[0] === r && lastMove?.[1] === c
          const cls = ['ttt-cell']
          if (isWin) cls.push('win')
          if (isLast) cls.push('last')
          return (
            <button
              key={`${r},${c}`}
              className={cls.join(' ')}
              disabled={disabled || cell !== 0}
              onClick={() => onPlace(r, c)}
            >
              {cell !== 0 && (
                <span className={`ttt-mark ${cell === X ? 'x' : 'o'}`}>{cell === X ? '✕' : '○'}</span>
              )}
            </button>
          )
        }),
      )}
    </div>
  )
}

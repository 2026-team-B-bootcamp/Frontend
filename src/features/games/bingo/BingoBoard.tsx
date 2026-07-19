/**
 * 빙고판을 그리기만 하는 컴포넌트 — 서버 통신은 하지 않는다.
 * 클릭 시 어떤 숫자를 눌렀는지만 onCellClick으로 부모(BingoPanel)에 알리고,
 * 실제 요청·상태 갱신은 BingoPanel이 담당한다.
 */
import { motion } from 'motion/react'
import { completedLineIndices } from './lines'

export function BingoBoard({
  board,
  called,
  onCellClick,
  disabled,
}: {
  board: number[]
  called: Set<number>
  onCellClick: (n: number) => void
  disabled: boolean
}) {
  // board(내 보드 숫자 25칸) 중 called(서버가 이미 호출한 숫자)에 포함된 칸을 마킹 처리
  const marked = board.map((n) => called.has(n))
  // 완성된 줄에 속한 칸들을 계산해 하이라이트 스타일에 쓴다
  const lineCells = completedLineIndices(marked)

  return (
    <div className="bingo-grid">
      {board.map((n, i) => {
        const isMarked = marked[i]
        const classes = ['bingo-cell']
        if (isMarked) classes.push('marked')
        if (lineCells.has(i)) classes.push('line')
        return (
          <motion.button
            key={i}
            className={classes.join(' ')}
            // 이미 마킹된 칸이거나 게임이 끝났으면(disabled) 다시 누를 수 없다
            disabled={disabled || isMarked}
            onClick={() => onCellClick(n)}
            whileTap={{ scale: 0.94 }}
            animate={isMarked ? { scale: [1.12, 1] } : { scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {n}
          </motion.button>
        )
      })}
    </div>
  )
}

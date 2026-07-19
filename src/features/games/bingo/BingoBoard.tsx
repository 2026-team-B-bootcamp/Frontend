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
  const marked = board.map((n) => called.has(n))
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

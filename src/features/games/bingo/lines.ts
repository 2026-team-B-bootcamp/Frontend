export const GRID_SIZE = 5
export const CELL_COUNT = GRID_SIZE * GRID_SIZE
export const NUMBER_RANGE = 25

export const LINES: number[][] = (() => {
  const lines: number[][] = []
  for (let row = 0; row < GRID_SIZE; row++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, col) => row * GRID_SIZE + col))
  }
  for (let col = 0; col < GRID_SIZE; col++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, row) => row * GRID_SIZE + col))
  }
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => i * GRID_SIZE + i))
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => i * GRID_SIZE + (GRID_SIZE - 1 - i)))
  return lines
})()

export function generateBoard(): number[] {
  const numbers = Array.from({ length: NUMBER_RANGE }, (_, i) => i + 1)
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }
  return numbers
}

export function countCompletedLines(marked: boolean[]): number {
  return LINES.reduce((count, line) => (line.every((i) => marked[i]) ? count + 1 : count), 0)
}

export function completedLineIndices(marked: boolean[]): Set<number> {
  const cells = new Set<number>()
  for (const line of LINES) {
    if (line.every((i) => marked[i])) {
      line.forEach((i) => cells.add(i))
    }
  }
  return cells
}

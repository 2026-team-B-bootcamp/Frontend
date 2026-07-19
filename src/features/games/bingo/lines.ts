/**
 * 빙고 규칙(5x5 판, 줄 판정)을 계산하는 순수 로직 모음.
 * 서버·클라이언트 어느 쪽에도 속하지 않는 공용 계산이라 BingoBoard/BingoPanel에서 가져다 쓴다.
 */

export const GRID_SIZE = 5
export const CELL_COUNT = GRID_SIZE * GRID_SIZE
export const NUMBER_RANGE = 25

// 판에서 "완성"으로 인정되는 모든 줄(가로 5 + 세로 5 + 대각선 2 = 12줄)을
// 칸 인덱스(0~24) 배열로 미리 만들어둔다.
export const LINES: number[][] = (() => {
  const lines: number[][] = []
  // 가로줄
  for (let row = 0; row < GRID_SIZE; row++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, col) => row * GRID_SIZE + col))
  }
  // 세로줄
  for (let col = 0; col < GRID_SIZE; col++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, row) => row * GRID_SIZE + col))
  }
  // 대각선(↘, ↙) 두 줄
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => i * GRID_SIZE + i))
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => i * GRID_SIZE + (GRID_SIZE - 1 - i)))
  return lines
})()

// 1~25 숫자를 무작위로 섞어 개인 보드를 만든다(Fisher-Yates 셔플).
export function generateBoard(): number[] {
  const numbers = Array.from({ length: NUMBER_RANGE }, (_, i) => i + 1)
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }
  return numbers
}

// marked(칸별 마킹 여부)를 받아 완성된 줄이 몇 개인지 센다 — 승패 판정(3줄)에 사용.
export function countCompletedLines(marked: boolean[]): number {
  return LINES.reduce((count, line) => (line.every((i) => marked[i]) ? count + 1 : count), 0)
}

// 완성된 줄에 속한 칸 인덱스만 모아 반환 — 보드에서 완성 줄을 하이라이트할 때 사용.
export function completedLineIndices(marked: boolean[]): Set<number> {
  const cells = new Set<number>()
  for (const line of LINES) {
    if (line.every((i) => marked[i])) {
      line.forEach((i) => cells.add(i))
    }
  }
  return cells
}

import confetti from 'canvas-confetti'

/** 승리 연출: 가운데 팡 + 좌우 크래커 */
export function fireWinConfetti() {
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 } })
  setTimeout(() => {
    confetti({ particleCount: 55, angle: 60, spread: 55, origin: { x: 0, y: 0.8 } })
  }, 180)
  setTimeout(() => {
    confetti({ particleCount: 55, angle: 120, spread: 55, origin: { x: 1, y: 0.8 } })
  }, 360)
}

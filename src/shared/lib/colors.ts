// 뮤트된 웜 톤 팔레트 — web-warm-workspace 팩의 절제된 미감에 맞춤
export const PALETTE = [
  '#4f4dc4',
  '#b5735f',
  '#6f8f66',
  '#5c7fa3',
  '#8d6a94',
  '#a08040',
  '#4f8d8b',
  '#b06a78',
]

export function avatarColor(userId: number) {
  return PALETTE[userId % PALETTE.length]
}

export function serverColor(serverId: number) {
  return PALETTE[serverId % PALETTE.length]
}

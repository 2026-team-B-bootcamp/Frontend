// 유저/서버 아바타 색상을 정하는 공용 유틸. id를 팔레트 배열의 인덱스로 매핑해서
// 같은 id는 항상 같은 색이 나오게 한다 (서버 요청 없이 프론트에서만 계산).
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

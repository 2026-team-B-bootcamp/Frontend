// 유저/서버 아바타 색상을 정하는 공용 유틸. id를 팔레트 배열의 인덱스로 매핑해서
// 같은 id는 항상 같은 색이 나오게 한다 (서버 요청 없이 프론트에서만 계산).
// 이리데센트 팩 3색(스카이·코랄·라임) 계열을 흰 이니셜이 읽히는 명도로 낮춘 팔레트
export const PALETTE = [
  '#3f8fc9',
  '#e8623c',
  '#7ca32e',
  '#5fa8dd',
  '#f07d55',
  '#93b83d',
  '#2f7db5',
  '#d95430',
]

export function avatarColor(userId: number) {
  return PALETTE[userId % PALETTE.length]
}

export function serverColor(serverId: number) {
  return PALETTE[serverId % PALETTE.length]
}

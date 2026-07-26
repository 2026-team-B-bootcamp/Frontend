/**
 * 끝말잇기·초성퀴즈(폭탄 돌리기류) 공통 타입.
 * 두 게임 다 "판 전체에 도화선 하나, 시간이 다 되면 폭탄을 든 사람이 패배" 규칙을
 * 공유해서 상태 모양도 거의 같다. wordchain/api.ts, chosung/api.ts는 이 공통 타입을
 * extends해 각자 다른 필드(words 타입, round, prompt)만 얹는다.
 */
export interface BombPlayer {
  user_id: number
  display_name: string
  alive: boolean
}

export interface BombGameState {
  status: 'waiting' | 'playing' | 'finished'
  players: BombPlayer[]
  turn_user_id: number | null
  loser_user_id: number | null
  seconds_left: number | null
  last_event: string | null
  // 이 판을 연 사람(방장). 이 사람만 강제 종료할 수 있다.
  host_user_id: number | null
}

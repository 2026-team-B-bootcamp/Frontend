// 미니게임 종류. 컴포넌트 파일(GamePip.tsx)에 두면 상수를 import하는 쪽 때문에
// fast refresh가 깨지므로 따로 뺐다(gamesStatus.ts와 같은 이유).
//
// ⚠️ 이 키들은 백엔드와 맞춰져 있다:
//   - REST 경로 (/channels/{id}/bingo …)
//   - 슬랙 봇의 기능 카탈로그 (Backend/app/slack/features.py)
// 하나를 바꾸면 셋을 같이 바꿔야 한다.
export type GameKind = 'bingo' | 'wordchain' | 'omok' | 'tictactoe' | 'balance' | 'chosung'

// 위 타입은 런타임에 남지 않는다. 슬랙 링크의 ?open= 처럼 바깥에서 들어온
// 문자열을 검사하려면 값으로 된 목록이 따로 필요하다.
export const GAME_KINDS: readonly GameKind[] = [
  'bingo',
  'wordchain',
  'omok',
  'tictactoe',
  'balance',
  'chosung',
]

export function isGameKind(value: string): value is GameKind {
  return (GAME_KINDS as readonly string[]).includes(value)
}

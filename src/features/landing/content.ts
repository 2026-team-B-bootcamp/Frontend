// LandingPage.tsx가 쓰는 순수 데이터(JSX 없음). SHOWCASE는 mock 컴포넌트를 JSX로
// 품고 있어서 여기 넣지 않고 PinnedShowcase.tsx 안에 둔다.

export const MARQUEE_TAGS = [
  '축구', '커피', '베이킹', '롤', '등산', '여행', '영화', '캠핑',
  '독서', '헬스', '포켓몬', '재즈', '요리', '사진', '보드게임', '러닝',
]

export const STEPS = [
  { n: '01', title: '서버 만들기', desc: '모임 공간을 만들면 기본 채널이 함께 생겨요' },
  { n: '02', title: '초대코드 공유', desc: '8자리 코드 하나로 멤버를 초대하세요' },
  { n: '03', title: '관심사 태그 설정', desc: '나를 소개하는 태그 3개를 골라요' },
  { n: '04', title: '대화 시작', desc: '태그·AI 질문·게임으로 자연스럽게 친해져요' },
]

export const FLOAT_PILLS = [
  { text: '커피 ✦', x: '6%', y: '22%', dur: 5.2, delay: 0 },
  { text: '등산', x: '12%', y: '58%', dur: 6.1, delay: 0.4 },
  { text: '롤', x: '86%', y: '26%', dur: 5.6, delay: 0.8 },
  { text: '여행 ✦', x: '82%', y: '62%', dur: 6.6, delay: 0.2 },
  { text: '베이킹', x: '90%', y: '44%', dur: 5.9, delay: 1.1 },
  { text: '재즈', x: '4%', y: '40%', dur: 6.4, delay: 0.6 },
]

/** 통계 카드 4개 — delay는 렌더링 시점에 0.08 * i로 계산한다 */
export const STATS = [
  { to: 6, suffix: '종', label: '채팅 옆에서 바로 하는 미니게임' },
  { to: 1, suffix: '분', label: '서버 만들고 초대까지' },
  { to: 120, suffix: '초', label: '도화선 하나로 폭탄 돌리기 — 끝말잇기·초성퀴즈' },
  { to: 100, suffix: '%', label: '실시간 — 새로고침 없는 대화' },
]

/** 게임 그리드 6종 — 키는 games/gameKinds.ts·백엔드 카탈로그와 1:1 */
export const GAME_CARDS = [
  { key: 'bingo', name: '빙고', desc: '한 판에서 같이 번호를 지워가는 클래식' },
  { key: 'wordchain', name: '끝말잇기', desc: '120초 도화선 폭탄 돌리기 — 마지막에 든 사람이 패배' },
  { key: 'omok', name: '오목', desc: '흑과 백, 차분한 두뇌 싸움 한 판' },
  { key: 'tictactoe', name: '틱택토', desc: '규칙 설명이 필요 없는 가장 빠른 대전' },
  { key: 'balance', name: '밸런스게임', desc: 'A냐 B냐 — 고르는 순간 취향이 보여요' },
  { key: 'chosung', name: '초성퀴즈', desc: '초성만 보고 맞히는 스피드 퀴즈' },
] as const

/** 슬랙 섹션 불릿 — Backend/app/slack (features.py·handlers·mirror.py) 기준 */
export const SLACK_POINTS = [
  {
    title: '채널에서 바로 시작',
    desc: '"빙고 하자"라고 치면 봇이 게임 버튼을 띄워요. 게임 6종과 같이보기·그림판 전부.',
  },
  {
    title: '본인 확인은 링크 하나로',
    desc: '버튼을 누르면 나만 볼 수 있는 입장 링크가 와요. 로그인 없이 15분 안에 바로 입장.',
  },
  {
    title: '슬랙과 웹이 같은 판',
    desc: '슬랙에서 들어온 사람과 웹에서 하던 사람이 같은 보드에서 만나요. 태그 등록과 AI 말걸기는 슬랙 안에서 끝나고요.',
  },
]

/**
 * 기능 하나만 화면 가득 보여주는 전용 페이지.
 *
 * 슬랙에서 "빙고 하자"를 눌러 들어온 사람에게 채팅방 위에 떠 있는 작은 PIP를 주면
 * 정작 하러 온 것이 곁다리로 보인다. 이 경로로 들어오면 그 기능만 화면에 있다.
 *
 * 패널·API는 채팅방에서 쓰던 것을 그대로 재사용한다 — 같은 채널, 같은 실시간 연결이라
 * 웹에서 PIP로 하는 사람과 이 페이지로 들어온 사람이 같은 판에서 만난다.
 */
import { useRef } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { useChannelSocket } from '../../shared/realtime/useChannelSocket'
import { isGameKind } from '../games/gameKinds'
import { BingoPanel } from '../games/bingo/BingoPanel'
import { WordChainPanel } from '../games/wordchain/WordChainPanel'
import { OmokPanel } from '../games/omok/OmokPanel'
import { TicTacToePanel } from '../games/tictactoe/TicTacToePanel'
import { BalancePanel } from '../games/balance/BalancePanel'
import { ChosungPanel } from '../games/chosung/ChosungPanel'
import { WatchTogether } from '../watch/WatchTogether'
import { Whiteboard } from '../draw/Whiteboard'
import { MembersPanel } from '../chat/MembersPanel'
import { TagSetupModal } from '../users/TagSetupModal'

// 화면 제목. features.py(백엔드 카탈로그)의 라벨과 맞춰둔다.
const TITLES: Record<string, string> = {
  bingo: '🎲 빙고',
  wordchain: '🔤 끝말잇기',
  omok: '⚫ 오목',
  tictactoe: '⭕ 틱택토',
  balance: '⚖️ 밸런스게임',
  chosung: '🔠 초성퀴즈',
  watch: '📺 같이보기',
  draw: '🎨 그림판',
  members: '👥 멤버',
  tags: '🏷️ 관심사 태그',
}

export function FeaturePage() {
  const { serverId, channelId, feature = '' } = useParams()
  const sid = Number(serverId)
  const cid = Number(channelId)
  const { token } = useAuth()
  const navigate = useNavigate()
  const pageRef = useRef<HTMLDivElement>(null)
  const { subscribe, online } = useChannelSocket(cid, token)

  const chatHref = `/servers/${serverId}/channels/${channelId}`

  // 모르는 기능이면 채팅방으로 돌려보낸다 — 빈 화면을 보여주는 것보다 낫다.
  if (!TITLES[feature] || !Number.isFinite(cid) || !Number.isFinite(sid)) {
    return <Navigate to={chatHref} replace />
  }

  return (
    <div className="feature-page" ref={pageRef}>
      <header className="feature-page-head">
        <Link className="feature-page-back" to={chatHref}>
          <span aria-hidden="true">←</span>
          <span>채팅으로</span>
        </Link>
        <h1 className="feature-page-title">{TITLES[feature]}</h1>
      </header>

      <main className="feature-page-body">
        {isGameKind(feature) && (
          <div className="feature-page-panel">
            {feature === 'bingo' && <BingoPanel channelId={cid} subscribe={subscribe} />}
            {feature === 'wordchain' && <WordChainPanel channelId={cid} subscribe={subscribe} />}
            {feature === 'omok' && <OmokPanel channelId={cid} subscribe={subscribe} />}
            {feature === 'tictactoe' && <TicTacToePanel channelId={cid} subscribe={subscribe} />}
            {feature === 'balance' && <BalancePanel channelId={cid} subscribe={subscribe} />}
            {feature === 'chosung' && <ChosungPanel channelId={cid} subscribe={subscribe} />}
          </div>
        )}

        {/* 같이보기·그림판은 원래 떠다니는 창이라 embedded로 드래그·리사이즈를 끈다.
            onClose는 창을 닫는 대신 채팅방으로 돌아가는 뜻이 된다. */}
        {feature === 'watch' && (
          <WatchTogether
            channelId={cid}
            subscribe={subscribe}
            onClose={() => navigate(chatHref)}
            constraintsRef={pageRef}
            embedded
          />
        )}
        {feature === 'draw' && (
          <Whiteboard
            channelId={cid}
            subscribe={subscribe}
            onClose={() => navigate(chatHref)}
            constraintsRef={pageRef}
            embedded
          />
        )}

        {feature === 'members' && (
          <div className="feature-page-panel">
            <MembersPanel serverId={sid} online={online} />
          </div>
        )}

        {/* 태그 등록은 원래 서버 첫 입장에 뜨는 모달이다. 여기서는 그 자체가 목적지라
            "나중에 하기"도 저장도 채팅방으로 돌아가는 것으로 끝난다. */}
        {feature === 'tags' && (
          <TagSetupModal
            serverId={sid}
            onDismiss={() => navigate(chatHref)}
            onSaved={() => navigate(chatHref)}
          />
        )}
      </main>
    </div>
  )
}

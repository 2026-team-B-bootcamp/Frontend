/**
 * 서버(모임) 하나에 들어왔을 때 보이는 채팅 화면 전체를 구성하는 최상위 페이지.
 * 좌측 서버 레일 + 채널 사이드바, 가운데 채팅방(ChatRoom), 우측 멤버/미니게임 패널을 조립한다.
 *
 * 서버·채널 데이터와 그 CRUD는 useServerChannels, 반응형 레이아웃(드로어·패널 열림 상태)은
 * useChatShellLayout, 관심사 태그 온보딩은 useTagSetupOnboarding에 각각 위임하고, 이 컴포넌트는
 * 그것들을 조립해 화면 하나로 그린다. 실시간 연결은 useChannelSocket 훅 하나로 열어서 그
 * 결과(subscribe, online, typers)를 ChatRoom과 미니게임 패널들, useServerChannels에 그대로 내려준다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../auth/authContext'
import { listServers } from '../servers/api'
import { ServerRail } from '../servers/ServerRail'
import { ChannelSidebar } from '../servers/ChannelSidebar'
import { ServerAddModal } from '../servers/ServerAddModal'
import { useServerChannels } from '../servers/useServerChannels'
import { ProfileModal } from '../users/ProfileModal'
import { TagSetupModal } from '../users/TagSetupModal'
import { GamePip } from '../games/GamePip'
import { useGamesStatus } from '../games/gamesStatus'
import { WatchTogether } from '../watch/WatchTogether'
import { Whiteboard } from '../draw/Whiteboard'
import { ChatRoom } from './ChatRoom'
import { createWelcome } from './api'
import { ChatHeader } from './ChatHeader'
import { MembersSidePanel } from './MembersSidePanel'
import { useChatShellLayout } from './useChatShellLayout'
import { useTagSetupOnboarding } from './useTagSetupOnboarding'
import { useChannelSocket } from '../../shared/realtime/useChannelSocket'

export function ChatPage() {
  const { serverId, channelId } = useParams()
  const sid = Number(serverId)
  const cid = Number(channelId)
  const { token, userId, displayName, logout } = useAuth()
  const navigate = useNavigate()

  // 좁은 화면 대응(드로어·오버레이)과 미니게임류 패널 열림 상태
  const {
    panelIsOverlay,
    navOpen,
    closeNav,
    setNavRequested,
    showMembers,
    setShowMembers,
    gameOpen,
    setGameOpen,
    watchOpen,
    setWatchOpen,
    drawOpen,
    setDrawOpen,
  } = useChatShellLayout()

  // 채널의 실시간 웹소켓 연결. subscribe로 이벤트 구독, online/typers는 접속중/입력중 상태
  const { subscribe, online, typers, sendTyping } = useChannelSocket(cid, token)
  // 진행 중인 게임이 있으면 헤더 미니게임 아이콘에 라이브 점을 띄워 관전을 유도한다
  const gameStatuses = useGamesStatus(cid, subscribe)
  const anyGameLive = Object.values(gameStatuses).some((s) => s === 'playing')

  // useCallback으로 참조를 고정한다 — 이 콜백이 useServerChannels 안 WS 구독 이펙트의
  // deps에 들어가므로, 인라인 함수로 넘기면 매 렌더 구독을 끊었다 다시 건다
  // (같은 이유의 경고가 useGameEnded.ts:22-24에도 적혀 있다).
  const onServerGone = useCallback(() => {
    navigate('/servers', { replace: true })
  }, [navigate])

  // 서버·채널 목록과 그 CRUD. server.deleted가 지금 보고 있던 서버를 지운 경우에만
  // 이 화면을 목록으로 돌려보낸다(그 외 이름 변경·채널 삭제 등은 훅이 알아서 반영).
  const {
    servers,
    setServers,
    channels,
    onAddChannel,
    onRenameServer,
    onRenameChannel,
    onDeleteChannel,
    onDeleteServer,
    onLeaveServer,
  } = useServerChannels(sid, cid, subscribe, closeNav, onServerGone)

  const tagSetupOnboarding = useTagSetupOnboarding(sid, userId)

  const [showProfile, setShowProfile] = useState(false)
  const [showAddServer, setShowAddServer] = useState(false)
  const [membersRefresh, setMembersRefresh] = useState(0)
  // 게임 PIP의 드래그 경계 — 채팅 본문 안에서만 움직이게 한다
  const chatMainRef = useRef<HTMLElement>(null)

  // 남이 나를 내보냈을 때(내가 나가지거나, 남이 나갔을 때) — 멤버 패널 갱신·화면 이동이
  // 함께 필요해 여기서 직접 처리한다. 그 외(이름 변경·채널/서버 삭제)는 useServerChannels가
  // 자신의 subscribe로 따로 처리한다(listenersRef가 Set이라 구독 두 개가 안전하게 공존한다).
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type !== 'server.member_removed') return
        const { server_id, user_id } = e.payload as { server_id: number; user_id: number }
        if (user_id === userId) {
          // 내가 나가게 됐다. 그대로 두면 다음 요청마다 403이 뜨는 화면에
          // 남아 있게 되므로 목록으로 돌려보낸다.
          navigate('/servers', { replace: true })
        } else if (server_id === sid) {
          // 남이 나갔다 — 멤버 패널을 다시 그린다
          setMembersRefresh((k) => k + 1)
        }
      }),
    [subscribe, userId, sid, navigate],
  )

  function onLogout() {
    logout()
    navigate('/login')
  }

  const activeServer = servers.find((s) => s.id === sid)
  const activeChannel = channels.find((c) => c.id === cid)

  return (
    <div className="app-shell">
      {/* 데스크톱에선 display:contents로 투명하게 사라져 레일·사이드바가 셸의 직계 플렉스 아이템이 되고,
          모바일에선 이 래퍼가 왼쪽에서 밀려 나오는 드로어가 된다 */}
      <div className={`nav-drawer${navOpen ? ' open' : ''}`}>
        <ServerRail
          servers={servers}
          activeId={sid}
          onSelect={(id) => {
            navigate(`/servers/${id}`)
            closeNav()
          }}
          onAdd={() => {
            setShowAddServer(true)
            closeNav()
          }}
        />

        <ChannelSidebar
          server={activeServer}
          channels={channels}
          activeChannelId={cid}
          displayName={displayName}
          onAddChannel={onAddChannel}
          onRenameServer={onRenameServer}
          onRenameChannel={onRenameChannel}
          onDeleteChannel={onDeleteChannel}
          onDeleteServer={onDeleteServer}
          onLeaveServer={onLeaveServer}
          onProfile={() => {
            setShowProfile(true)
            closeNav()
          }}
          onLogout={onLogout}
          /* 모바일 드로어에서 채널을 고르면 바로 닫고 채팅으로 돌아간다 */
          onNavigate={closeNav}
        />
      </div>

      {/* 드로어 뒤 어둡게 깔리는 면 — 탭하면 닫힌다 (모바일에서만 보임) */}
      <AnimatePresence>
        {navOpen && (
          <motion.div
            className="nav-scrim"
            onClick={closeNav}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <main className="chat-main" ref={chatMainRef}>
        <ChatHeader
          channelName={activeChannel?.name}
          onOpenNav={() => setNavRequested(true)}
          onlineCount={online.size}
          showMembers={showMembers}
          onToggleMembers={() => setShowMembers((v) => !v)}
          gameOpen={gameOpen}
          onToggleGame={() => setGameOpen((v) => !v)}
          anyGameLive={anyGameLive}
          watchOpen={watchOpen}
          onToggleWatch={() => setWatchOpen((v) => !v)}
          drawOpen={drawOpen}
          onToggleDraw={() => setDrawOpen((v) => !v)}
        />

        {/* key로 채널 전환 시 리마운트 → 메시지/커서 상태가 자연스럽게 초기화됨.
            채널이 아직 정해지지 않은 잠깐(첫 채널로 replace 이동 중)은 빈 로그 영역으로 자리를 지킨다 */}
        {Number.isFinite(cid) ? (
          <ChatRoom
            key={cid}
            serverId={sid}
            channelId={cid}
            channelName={activeChannel?.name}
            subscribe={subscribe}
            typers={typers}
            sendTyping={sendTyping}
          />
        ) : (
          <div className="chat-log" />
        )}

        {/* 미니게임 PIP — 채팅 위에 떠서 헤더를 잡고 옮길 수 있는 플로팅 창.
            채널이 정해진 뒤에만 띄운다(게임 API는 채널 id가 필요) */}
        <AnimatePresence>
          {gameOpen && Number.isFinite(cid) && (
            <GamePip
              channelId={cid}
              subscribe={subscribe}
              onClose={() => setGameOpen(false)}
              constraintsRef={chatMainRef}
              statuses={gameStatuses}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {watchOpen && Number.isFinite(cid) && (
            <WatchTogether
              key={cid}
              channelId={cid}
              subscribe={subscribe}
              onClose={() => setWatchOpen(false)}
              constraintsRef={chatMainRef}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {drawOpen && Number.isFinite(cid) && (
            <Whiteboard
              channelId={cid}
              subscribe={subscribe}
              onClose={() => setDrawOpen(false)}
              constraintsRef={chatMainRef}
            />
          )}
        </AnimatePresence>
      </main>

      <MembersSidePanel
        show={showMembers}
        panelIsOverlay={panelIsOverlay}
        onClose={() => setShowMembers(false)}
        serverId={sid}
        membersRefresh={membersRefresh}
        online={online}
        onOpenTagStats={tagSetupOnboarding.openBrowse}
      />

      <AnimatePresence>
        {showAddServer && (
          <ServerAddModal
            onClose={() => setShowAddServer(false)}
            onDone={(server) => {
              setShowAddServer(false)
              listServers()
                .then(setServers)
                .catch(() => {
                  // 레일 갱신 실패는 치명적이지 않음
                })
              navigate(`/servers/${server.id}`)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <ProfileModal
            serverId={sid}
            serverName={activeServer?.name}
            onClose={() => setShowProfile(false)}
            onSaved={() => setMembersRefresh((k) => k + 1)}
          />
        )}
      </AnimatePresence>

      {/* 관심사 태그 모달 — 태그가 빈 사람에게 자동으로(onboarding),
          멤버 패널의 버튼으로는 언제든(browse) 열린다 */}
      <AnimatePresence>
        {tagSetupOnboarding.mode !== null && Number.isFinite(sid) && (
          <TagSetupModal
            serverId={sid}
            serverName={activeServer?.name}
            mode={tagSetupOnboarding.mode}
            onDismiss={tagSetupOnboarding.dismiss}
            onSaved={() => {
              tagSetupOnboarding.close()
              setMembersRefresh((k) => k + 1)
              // 태그를 막 등록했으니 이제 등장 소개를 만들 수 있다.
              // 백엔드는 태그가 없으면 카드를 만들지 않으므로(맹탕 카드가 "채널당 1회"를
              // 소진하는 것을 막기 위해), 등록 직후인 여기서 다시 부르는 게 실제 생성 시점이다.
              // 만들어진 카드는 WebSocket(message.new)으로 ChatRoom에 도착한다.
              if (Number.isFinite(cid)) void createWelcome(cid).catch(() => {})
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

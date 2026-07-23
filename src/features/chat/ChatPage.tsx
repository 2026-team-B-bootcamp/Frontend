/**
 * 서버(모임) 하나에 들어왔을 때 보이는 채팅 화면 전체를 구성하는 최상위 페이지.
 * 좌측 서버 레일 + 채널 사이드바, 가운데 채팅방(ChatRoom), 우측 멤버/미니게임 패널을 조립한다.
 * 서버·채널 목록은 servers/api.ts로 불러오고, 실시간 연결은 useChannelSocket 훅 하나로 열어서
 * 그 결과(subscribe, online, typers)를 ChatRoom과 미니게임 패널들에 그대로 내려준다.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../auth/authContext'
import {
  createChannel,
  getMembers,
  listChannels,
  listServers,
  type Channel,
  type Server,
} from '../servers/api'
import { ServerRail } from '../servers/ServerRail'
import { ChannelSidebar } from '../servers/ChannelSidebar'
import { ServerAddModal } from '../servers/ServerAddModal'
import { ProfileModal } from '../users/ProfileModal'
import { TagSetupModal } from '../users/TagSetupModal'
import { GamePip } from '../games/GamePip'
import { useGamesStatus } from '../games/gamesStatus'
import { WatchTogether } from '../watch/WatchTogether'
import { Whiteboard } from '../draw/Whiteboard'
import { ChatRoom } from './ChatRoom'
import { createWelcome } from './api'
import { MembersPanel } from './MembersPanel'
import { CloseIcon, DiceIcon, MenuIcon, PaletteIcon, TvIcon, UsersIcon } from '../../shared/ui/icons'
import { useChannelSocket } from '../../shared/realtime/useChannelSocket'
import { PANEL_OVERLAY_QUERY, useIsMobile, useMediaQuery } from '../../shared/lib/useMediaQuery'

// "나중에 하기"를 기억하는 localStorage 키.
// 반드시 userId까지 넣어야 한다 — 예전엔 서버 id만 썼더니 같은 브라우저에서 계정을 바꿔가며
// 쓸 때(데모·테스트에서 늘 하는 일) A가 한 번 미룬 서버는 B에게도 영영 안 떴다.
// B는 태그가 하나도 없는 첫 방문자인데 온보딩을 통째로 건너뛰는 셈이라 치명적이었다.
function tagSetupSkipKey(userId: number, serverId: number) {
  return `tag_setup_skipped_${userId}_${serverId}`
}

export function ChatPage() {
  const { serverId, channelId } = useParams()
  const sid = Number(serverId)
  const cid = Number(channelId)
  const { token, userId, displayName, logout } = useAuth()
  const navigate = useNavigate()

  const [servers, setServers] = useState<Server[]>([])
  // 채널 목록은 어느 서버 것인지(sid)를 함께 들고 있는다 — 서버 전환 직후
  // 이전 서버의 목록으로 사이드바를 그리거나 엉뚱한 채널로 리다이렉트하는 것을 막는다
  const [channelData, setChannelData] = useState<{ sid: number; list: Channel[] } | null>(null)
  const channels = channelData?.sid === sid ? channelData.list : []
  // 서버별 채널 목록 캐시 — 재방문 시 fetch를 기다리지 않고 바로 그린다 (백그라운드로 갱신)
  const channelCacheRef = useRef(new Map<number, Channel[]>())
  // 좁은 화면에서는 레일·사이드바가 드로어로(≤720px), 멤버 패널이 오버레이로(≤900px) 바뀐다
  const isMobile = useIsMobile()
  const panelIsOverlay = useMediaQuery(PANEL_OVERLAY_QUERY)
  // 드로어는 모바일에서만 존재한다 — 넓은 화면으로 돌아가면 열림 상태를 무시한다
  // (state를 되돌리는 대신 파생값으로 계산해 effect 없이 정리한다)
  const [navRequested, setNavRequested] = useState(false)
  const navOpen = navRequested && isMobile
  const closeNav = () => setNavRequested(false)
  // 멤버 사이드 패널과 미니게임 PIP는 서로 독립적으로 열고 닫는다.
  // 패널이 오버레이로 뜨는 폭에선 채팅을 가리므로 기본은 닫힌 상태로 시작한다.
  const [showMembers, setShowMembers] = useState(
    () => !window.matchMedia(PANEL_OVERLAY_QUERY).matches,
  )
  const [gameOpen, setGameOpen] = useState(false)
  const [watchOpen, setWatchOpen] = useState(false)
  const [drawOpen, setDrawOpen] = useState(false)
  // 게임 PIP의 드래그 경계 — 채팅 본문 안에서만 움직이게 한다
  const chatMainRef = useRef<HTMLElement>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showAddServer, setShowAddServer] = useState(false)
  const [membersRefresh, setMembersRefresh] = useState(0)
  // 관심사 태그가 비어 있는 사람에게 서버 입장 시 한 번 띄우는 온보딩 모달
  const [showTagSetup, setShowTagSetup] = useState(false)

  // 채널의 실시간 웹소켓 연결. subscribe로 이벤트 구독, online/typers는 접속중/입력중 상태
  const { subscribe, online, typers, sendTyping } = useChannelSocket(cid, token)
  // 진행 중인 게임이 있으면 헤더 미니게임 아이콘에 라이브 점을 띄워 관전을 유도한다
  const gameStatuses = useGamesStatus(cid, subscribe)
  const anyGameLive = Object.values(gameStatuses).some((s) => s === 'playing')

  // 서버 레일에 보여줄 내가 속한 서버 목록을 백엔드에서 가져온다
  useEffect(() => {
    let active = true
    listServers()
      .then((list) => {
        if (active) setServers(list)
      })
      .catch(() => {
        // 레일 목록 실패는 치명적이지 않음
      })
    return () => {
      active = false
    }
  }, [])

  // 마지막 방문 서버 기억 → 다음 로그인 때 바로 이 서버로
  useEffect(() => {
    if (Number.isFinite(sid)) localStorage.setItem('last_server_id', String(sid))
  }, [sid])

  // 관심사 태그가 비어 있으면 태그 설정 모달을 띄운다.
  // 태그는 이 서비스의 핵심(겹치는 관심사 매칭·AI 아이스브레이커)인데 예전엔 프로필 모달을
  // 직접 열어야만 설정할 수 있어 빈 채로 쓰는 사람이 많았다. 서버마다 한 번만 권하고,
  // "나중에 하기"를 누르면 그 서버에선 다시 묻지 않는다(localStorage).
  useEffect(() => {
    if (!Number.isFinite(sid) || userId == null) return
    if (localStorage.getItem(tagSetupSkipKey(userId, sid)) === '1') return
    let active = true
    getMembers(sid)
      .then((ms) => {
        const mine = ms.find((m) => m.user_id === userId)
        const hasTags = (mine?.tags ?? []).some((t) => t && t.trim().length > 0)
        if (active && mine && !hasTags) setShowTagSetup(true)
      })
      .catch(() => {
        // 목록을 못 받으면 조용히 넘어간다 — 프로필 모달로 언제든 설정할 수 있다
      })
    return () => {
      active = false
    }
  }, [sid, userId])

  useEffect(() => {
    let active = true
    // 캐시가 있으면 즉시 그리고(빈 사이드바 깜빡임 방지), 최신 목록은 뒤에서 받아와 덮어쓴다
    const cached = channelCacheRef.current.get(sid)
    if (cached) setChannelData({ sid, list: cached })
    listChannels(sid)
      .then((list) => {
        channelCacheRef.current.set(sid, list)
        if (active) setChannelData({ sid, list })
      })
      .catch(() => {
        if (active && !cached) navigate('/servers', { replace: true })
      })
    return () => {
      active = false
    }
  }, [sid, navigate])

  // URL에 채널이 없거나(서버 레일에서 방금 전환) 목록에 없는 채널이면 첫 채널로 정정한다.
  // 예전에는 별도 라우트(ServerEntry)가 null을 렌더하며 화면 전체를 비웠는데,
  // 이제 셸이 떠 있는 채로 조용히 replace 이동만 한다.
  useEffect(() => {
    if (!channelData || channelData.sid !== sid) return
    if (channelData.list.length === 0) {
      navigate('/servers', { replace: true })
      return
    }
    if (!channelData.list.some((c) => c.id === cid)) {
      navigate(`/servers/${sid}/channels/${channelData.list[0].id}`, { replace: true })
    }
  }, [channelData, sid, cid, navigate])

  // 열려 있는 오버레이(드로어/멤버 패널)는 Esc로 닫는다
  useEffect(() => {
    if (!navOpen && !(panelIsOverlay && showMembers)) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (navOpen) setNavRequested(false)
      else setShowMembers(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen, panelIsOverlay, showMembers])

  function onLogout() {
    logout()
    navigate('/login')
  }

  // 채널 추가: api로 백엔드에 생성 요청 후, 목록에 반영하고 새 채널로 바로 이동
  async function onAddChannel(name: string) {
    const ch = await createChannel(sid, name)
    const next = [...channels, ch]
    channelCacheRef.current.set(sid, next)
    setChannelData({ sid, list: next })
    navigate(`/servers/${sid}/channels/${ch.id}`)
    closeNav()
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
        <header className="chat-header">
          <button
            className="icon-btn nav-toggle"
            onClick={() => setNavRequested(true)}
            title="채널 목록"
            aria-label="채널 목록 열기"
          >
            <MenuIcon size={18} />
          </button>
          <span className="chat-channel-name"># {activeChannel?.name ?? '채팅'}</span>
          <div className="chat-header-links">
            <span className="online-count" title="접속 중">
              <span className="presence-dot on" /> {online.size}
            </span>
            <button
              className={`icon-btn${showMembers ? ' active' : ''}`}
              onClick={() => setShowMembers((v) => !v)}
              title="멤버"
            >
              <UsersIcon />
            </button>
            <button
              className={`icon-btn${gameOpen ? ' active' : ''}`}
              onClick={() => setGameOpen((v) => !v)}
              title={anyGameLive ? '미니게임 (진행 중)' : '미니게임'}
            >
              <DiceIcon />
              {anyGameLive && <span className="icon-live-dot" />}
            </button>
            <button
              className={`icon-btn${watchOpen ? ' active' : ''}`}
              onClick={() => setWatchOpen((v) => !v)}
              title="함께 보기"
            >
              <TvIcon />
            </button>
            <button
              className={`icon-btn${drawOpen ? ' active' : ''}`}
              onClick={() => setDrawOpen((v) => !v)}
              title="공유 그림판"
            >
              <PaletteIcon />
            </button>
          </div>
        </header>

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

      {/* 모바일에서 멤버 패널은 채팅 위를 덮는 오버레이라 뒤를 탭해 닫을 수 있어야 한다 */}
      <AnimatePresence>
        {showMembers && panelIsOverlay && (
          <motion.div
            className="side-scrim"
            onClick={() => setShowMembers(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMembers && (
          <motion.aside
            className="side-panel"
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="panel-head">
              <span className="panel-head-title">멤버</span>
              <button
                className="panel-close"
                onClick={() => setShowMembers(false)}
                title="닫기"
                aria-label="멤버 패널 닫기"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <div className="panel-body">
              {/* 프로필 저장 후(membersRefresh 증가) key가 바뀌어 리마운트 → 태그 변경이 바로 반영됨 */}
              <MembersPanel
                key={`${sid}-${membersRefresh}`}
                serverId={sid}
                online={online}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

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

      {/* 태그가 비어 있는 사람에게만 자동으로 뜨는 온보딩 모달 */}
      <AnimatePresence>
        {showTagSetup && Number.isFinite(sid) && (
          <TagSetupModal
            serverId={sid}
            serverName={activeServer?.name}
            onClose={() => {
              setShowTagSetup(false)
              // 닫았다는 사실을 남겨 이 서버에선 다시 묻지 않는다
              if (userId != null) localStorage.setItem(tagSetupSkipKey(userId, sid), '1')
            }}
            onSaved={() => {
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

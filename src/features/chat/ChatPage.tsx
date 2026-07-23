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
  listChannels,
  listServers,
  type Channel,
  type Server,
} from '../servers/api'
import { ServerRail } from '../servers/ServerRail'
import { ChannelSidebar } from '../servers/ChannelSidebar'
import { ServerAddModal } from '../servers/ServerAddModal'
import { ProfileModal } from '../users/ProfileModal'
import { GamePip } from '../games/GamePip'
import { useGamesStatus } from '../games/gamesStatus'
import { WatchTogether } from '../watch/WatchTogether'
import { Whiteboard } from '../draw/Whiteboard'
import { ChatRoom } from './ChatRoom'
import { MembersPanel } from './MembersPanel'
import { DiceIcon, PaletteIcon, TvIcon, UsersIcon } from '../../shared/ui/icons'
import { useChannelSocket } from '../../shared/realtime/useChannelSocket'

export function ChatPage() {
  const { serverId, channelId } = useParams()
  const sid = Number(serverId)
  const cid = Number(channelId)
  const { token, displayName, logout } = useAuth()
  const navigate = useNavigate()

  const [servers, setServers] = useState<Server[]>([])
  // 채널 목록은 어느 서버 것인지(sid)를 함께 들고 있는다 — 서버 전환 직후
  // 이전 서버의 목록으로 사이드바를 그리거나 엉뚱한 채널로 리다이렉트하는 것을 막는다
  const [channelData, setChannelData] = useState<{ sid: number; list: Channel[] } | null>(null)
  const channels = channelData?.sid === sid ? channelData.list : []
  // 서버별 채널 목록 캐시 — 재방문 시 fetch를 기다리지 않고 바로 그린다 (백그라운드로 갱신)
  const channelCacheRef = useRef(new Map<number, Channel[]>())
  // 멤버 사이드 패널과 미니게임 PIP는 서로 독립적으로 열고 닫는다
  const [showMembers, setShowMembers] = useState(true)
  const [gameOpen, setGameOpen] = useState(false)
  const [watchOpen, setWatchOpen] = useState(false)
  const [drawOpen, setDrawOpen] = useState(false)
  // 게임 PIP의 드래그 경계 — 채팅 본문 안에서만 움직이게 한다
  const chatMainRef = useRef<HTMLElement>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showAddServer, setShowAddServer] = useState(false)
  const [membersRefresh, setMembersRefresh] = useState(0)

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
  }

  const activeServer = servers.find((s) => s.id === sid)
  const activeChannel = channels.find((c) => c.id === cid)

  return (
    <div className="app-shell">
      <ServerRail
        servers={servers}
        activeId={sid}
        onSelect={(id) => navigate(`/servers/${id}`)}
        onAdd={() => setShowAddServer(true)}
      />

      <ChannelSidebar
        server={activeServer}
        channels={channels}
        activeChannelId={cid}
        displayName={displayName}
        onAddChannel={onAddChannel}
        onProfile={() => setShowProfile(true)}
        onLogout={onLogout}
      />

      <main className="chat-main" ref={chatMainRef}>
        <header className="chat-header">
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
    </div>
  )
}

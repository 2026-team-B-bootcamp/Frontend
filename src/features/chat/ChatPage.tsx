import { useEffect, useState, type ComponentType } from 'react'
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
import { BingoPanel } from '../games/bingo/BingoPanel'
import { WordChainPanel } from '../games/wordchain/WordChainPanel'
import { WheelPanel } from '../games/wheel/WheelPanel'
import { LadderPanel } from '../games/ladder/LadderPanel'
import {
  BingoPreview,
  LadderPreview,
  WheelPreview,
  WordChainPreview,
} from '../games/GamePreviews'
import { ChatRoom } from './ChatRoom'
import { MembersPanel } from './MembersPanel'
import { DiceIcon, UsersIcon } from '../../shared/ui/icons'
import { useChannelSocket } from '../../shared/realtime/useChannelSocket'

type PanelTab = 'members' | 'minigame'
type GameKind = 'bingo' | 'wordchain' | 'wheel' | 'ladder'

const GAMES: { key: GameKind; label: string; Preview: ComponentType }[] = [
  { key: 'bingo', label: '빙고', Preview: BingoPreview },
  { key: 'wordchain', label: '끝말잇기', Preview: WordChainPreview },
  { key: 'wheel', label: '돌림판', Preview: WheelPreview },
  { key: 'ladder', label: '사다리타기', Preview: LadderPreview },
]

export function ChatPage() {
  const { serverId, channelId } = useParams()
  const sid = Number(serverId)
  const cid = Number(channelId)
  const { token, displayName, logout } = useAuth()
  const navigate = useNavigate()

  const [servers, setServers] = useState<Server[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [panel, setPanel] = useState<PanelTab | null>('members')
  const [gameKind, setGameKind] = useState<GameKind>('bingo')
  const [showProfile, setShowProfile] = useState(false)
  const [showAddServer, setShowAddServer] = useState(false)
  const [membersRefresh, setMembersRefresh] = useState(0)

  const { subscribe, online, typers, sendTyping } = useChannelSocket(cid, token)

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
    listChannels(sid)
      .then((list) => {
        if (active) setChannels(list)
      })
      .catch(() => {
        navigate('/servers', { replace: true })
      })
    return () => {
      active = false
    }
  }, [sid, navigate])

  function onLogout() {
    logout()
    navigate('/login')
  }

  async function onAddChannel(name: string) {
    const ch = await createChannel(sid, name)
    setChannels((prev) => [...prev, ch])
    navigate(`/servers/${sid}/channels/${ch.id}`)
  }

  function togglePanel(tab: PanelTab) {
    setPanel((cur) => (cur === tab ? null : tab))
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

      <main className="chat-main">
        <header className="chat-header">
          <span className="chat-channel-name"># {activeChannel?.name ?? '채팅'}</span>
          <div className="chat-header-links">
            <span className="online-count" title="접속 중">
              <span className="presence-dot on" /> {online.size}
            </span>
            <button
              className={`icon-btn${panel === 'members' ? ' active' : ''}`}
              onClick={() => togglePanel('members')}
              title="멤버"
            >
              <UsersIcon />
            </button>
            <button
              className={`icon-btn${panel === 'minigame' ? ' active' : ''}`}
              onClick={() => togglePanel('minigame')}
              title="미니게임"
            >
              <DiceIcon />
            </button>
          </div>
        </header>

        {/* key로 채널 전환 시 리마운트 → 메시지/커서 상태가 자연스럽게 초기화됨 */}
        <ChatRoom
          key={cid}
          serverId={sid}
          channelId={cid}
          channelName={activeChannel?.name}
          subscribe={subscribe}
          typers={typers}
          sendTyping={sendTyping}
        />
      </main>

      <AnimatePresence>
        {panel && (
          <motion.aside
            className="side-panel"
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="panel-tabs">
              {(
                [
                  ['members', '멤버'],
                  ['minigame', '미니게임'],
                ] as [PanelTab, string][]
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  className={`panel-tab${panel === tab ? ' active' : ''}`}
                  onClick={() => setPanel(tab)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="panel-body">
              {panel === 'members' && (
                <MembersPanel
                  key={`${sid}-${membersRefresh}`}
                  serverId={sid}
                  online={online}
                />
              )}
              {panel === 'minigame' && (
                <>
                  <div className="game-select-grid">
                    {GAMES.map((g) => (
                      <button
                        key={g.key}
                        className={`game-select-card${gameKind === g.key ? ' active' : ''}`}
                        onClick={() => setGameKind(g.key)}
                      >
                        <g.Preview />
                        <span className="game-select-label">{g.label}</span>
                      </button>
                    ))}
                  </div>
                  {gameKind === 'bingo' && (
                    <BingoPanel channelId={cid} subscribe={subscribe} />
                  )}
                  {gameKind === 'wordchain' && (
                    <WordChainPanel channelId={cid} subscribe={subscribe} />
                  )}
                  {gameKind === 'wheel' && (
                    <WheelPanel channelId={cid} subscribe={subscribe} />
                  )}
                  {gameKind === 'ladder' && (
                    <LadderPanel channelId={cid} subscribe={subscribe} />
                  )}
                </>
              )}
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

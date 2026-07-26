// 서버 레일 + 채널 사이드바가 함께 쓰는 서버·채널 데이터.
// - 내가 속한 서버 목록(servers)과 현재 서버의 채널 목록(channels)을 백엔드에서 가져와 들고 있는다.
// - 채널 목록은 서버별로 캐시해 재방문 시 fetch를 기다리지 않고 바로 그린다.
// - URL의 서버/채널 id가 유효하지 않으면(없는 채널, 빈 서버) 조용히 정정 이동한다.
// - 채널/서버 이름 바꾸기, 채널 추가·삭제, 서버 삭제·나가기 요청과 그 후처리를 제공한다.
// - 남이 이름을 바꾸거나 채널·서버를 지웠을 때(WS)도 같은 상태를 갱신한다.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createChannel,
  deleteChannel,
  deleteServer,
  leaveServer,
  listChannels,
  listServers,
  renameChannel,
  renameServer,
  type Channel,
  type Server,
} from './api'
import { LAST_SERVER_KEY } from '../../shared/lib/storageKeys'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'

export function useServerChannels(
  sid: number,
  cid: number,
  subscribe: Subscribe,
  closeNav: () => void,
  // server.deleted는 (a)목록 정리와 (c)화면 이동을 둘 다 해야 하는 유일한 이벤트다.
  // 이동은 셸(ChatPage)의 몫이라 콜백으로 알려주고, 이 훅은 데이터 정리까지만 맡는다.
  onServerGone: (serverId: number) => void,
) {
  const navigate = useNavigate()

  const [servers, setServers] = useState<Server[]>([])
  // 채널 목록은 어느 서버 것인지(sid)를 함께 들고 있는다 — 서버 전환 직후
  // 이전 서버의 목록으로 사이드바를 그리거나 엉뚱한 채널로 리다이렉트하는 것을 막는다
  const [channelData, setChannelData] = useState<{ sid: number; list: Channel[] } | null>(null)
  const channels = channelData?.sid === sid ? channelData.list : []
  // 서버별 채널 목록 캐시 — 재방문 시 fetch를 기다리지 않고 바로 그린다 (백그라운드로 갱신)
  const channelCacheRef = useRef(new Map<number, Channel[]>())

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
    if (Number.isFinite(sid)) localStorage.setItem(LAST_SERVER_KEY, String(sid))
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

  // 채널 하나를 목록·캐시에서 걷어낸다. 내가 지웠을 때와 남이 지웠을 때(WS) 모두
  // 같은 정리가 필요해 한 곳에 둔다. 지워진 것이 지금 보고 있던 채널이면 위쪽
  // 정정 effect가 알아서 남은 첫 채널로 옮겨준다 — 여기서 따로 이동시키지 않는다.
  function dropChannelLocally(serverIdOfChannel: number, channelId: number) {
    const cached = channelCacheRef.current.get(serverIdOfChannel)
    if (cached) {
      channelCacheRef.current.set(
        serverIdOfChannel,
        cached.filter((c) => c.id !== channelId),
      )
    }
    setChannelData((prev) => {
      if (!prev || prev.sid !== serverIdOfChannel) return prev
      return { sid: prev.sid, list: prev.list.filter((c) => c.id !== channelId) }
    })
  }

  // 남이 이름을 바꾸거나 채널·모임을 지웠을 때 — 새로고침 없이 화면을 맞춘다.
  // 이름 변경은 내가 바꾼 경우에도 같은 이벤트가 돌아오지만, 이미 같은 값이라
  // 덮어써도 달라지는 게 없다(따로 걸러내지 않는다).
  // server.member_removed(내가 나가짐/남이 나감)는 멤버 패널 갱신·화면 이동까지 함께 하는
  // 별도 판단이 필요해 ChatPage가 자신의 subscribe로 직접 처리한다 — 여기서는 다루지 않는다.
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'server.renamed') {
          const { server_id, name } = e.payload as { server_id: number; name: string }
          setServers((prev) => prev.map((s) => (s.id === server_id ? { ...s, name } : s)))
        } else if (e.type === 'channel.renamed') {
          const { channel_id, name } = e.payload as { channel_id: number; name: string }
          setChannelData((prev) => {
            if (!prev) return prev
            const list = prev.list.map((c) => (c.id === channel_id ? { ...c, name } : c))
            channelCacheRef.current.set(prev.sid, list)
            return { sid: prev.sid, list }
          })
        } else if (e.type === 'channel.deleted') {
          const { server_id, channel_id } = e.payload as {
            server_id: number
            channel_id: number
          }
          dropChannelLocally(server_id, channel_id)
        } else if (e.type === 'server.deleted') {
          const { server_id } = e.payload as { server_id: number }
          setServers((prev) => prev.filter((s) => s.id !== server_id))
          channelCacheRef.current.delete(server_id)
          // 남이 지운 모임을 내가 보고 있었다면 그대로 두면 403이 뜨는 화면에 남는다
          if (server_id === sid) onServerGone(server_id)
        }
      }),
    [subscribe, sid, onServerGone],
  )

  // 채널 추가: api로 백엔드에 생성 요청 후, 목록에 반영하고 새 채널로 바로 이동
  async function onAddChannel(name: string) {
    const ch = await createChannel(sid, name)
    const next = [...channels, ch]
    channelCacheRef.current.set(sid, next)
    setChannelData({ sid, list: next })
    navigate(`/servers/${sid}/channels/${ch.id}`)
    closeNav()
  }

  // 서버 이름 변경 — 레일·사이드바가 모두 servers 목록을 보고 그리므로 그 한 곳만 고친다
  async function onRenameServer(name: string) {
    const updated = await renameServer(sid, name)
    setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  // 채널 이름 변경 — 목록과 캐시를 함께 갱신해야 서버를 오갔다 와도 옛 이름이 안 뜬다
  async function onRenameChannel(channelId: number, name: string) {
    const updated = await renameChannel(sid, channelId, name)
    setChannelData((prev) => {
      if (!prev || prev.sid !== sid) return prev
      const list = prev.list.map((c) => (c.id === updated.id ? updated : c))
      channelCacheRef.current.set(sid, list)
      return { sid, list }
    })
  }

  // 채널 삭제(방장). 내가 보고 있던 채널을 지운 경우 삭제 브로드캐스트가 그 채널로는
  // 오지 않으므로(채널이 이미 없다) 응답을 받은 자리에서 직접 목록을 고친다.
  async function onDeleteChannel(channelId: number) {
    await deleteChannel(sid, channelId)
    dropChannelLocally(sid, channelId)
  }

  // 모임 삭제(방장) / 나가기(멤버) — 둘 다 이 화면에 더 머무를 이유가 없어진다.
  // 남겨두면 다음 요청부터 403·404가 뜨는 화면을 보게 되므로 목록으로 돌려보낸다.
  function leaveThisServerScreen() {
    channelCacheRef.current.delete(sid)
    setServers((prev) => prev.filter((s) => s.id !== sid))
    navigate('/servers', { replace: true })
  }

  async function onDeleteServer() {
    await deleteServer(sid)
    leaveThisServerScreen()
  }

  async function onLeaveServer() {
    await leaveServer(sid)
    leaveThisServerScreen()
  }

  return {
    servers,
    setServers,
    channels,
    onAddChannel,
    onRenameServer,
    onRenameChannel,
    onDeleteChannel,
    onDeleteServer,
    onLeaveServer,
  }
}

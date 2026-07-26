/**
 * 되돌릴 수 없는 세 가지를 한 번 더 묻는다 — 채널 삭제, 모임 삭제, 모임 나가기.
 * 모임 삭제만 이름을 직접 입력받는데, 피해 범위가 채널 하나가 아니라
 * 모임 전체(모든 채널·대화·멤버)이기 때문이다.
 */
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import type { Channel, Server } from './api'

// 확인 모달로 잡아 둔 동작. 한 번에 하나만 열리므로 상태 하나로 둔다.
export type SidebarPendingAction =
  | { kind: 'channel'; channel: Channel }
  | { kind: 'deleteServer' }
  | { kind: 'leaveServer' }
  | null

export function SidebarDangerDialogs({
  server,
  pending,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  server?: Server
  pending: SidebarPendingAction
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <ConfirmDialog
        open={pending?.kind === 'channel'}
        title="이 채널을 삭제할까요?"
        description="채널 안의 대화가 모두 사라지고 되돌릴 수 없어요."
        target={pending?.kind === 'channel' ? `# ${pending.channel.name}` : undefined}
        busy={busy}
        error={error}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
      <ConfirmDialog
        open={pending?.kind === 'deleteServer'}
        title="이 모임을 삭제할까요?"
        description="모든 채널과 대화, 멤버가 함께 사라지고 되돌릴 수 없어요."
        target={server?.name}
        confirmText={server?.name}
        busy={busy}
        error={error}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
      <ConfirmDialog
        open={pending?.kind === 'leaveServer'}
        title="이 모임에서 나갈까요?"
        description="남긴 메시지는 그대로 남고, 초대코드로 다시 들어올 수 있어요."
        target={server?.name}
        confirmLabel="나가기"
        busy={busy}
        error={error}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </>
  )
}

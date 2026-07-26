/**
 * 게임 종류 → 패널 컴포넌트 매핑.
 * GamePip(채팅 위 PIP 창)와 FeaturePage(전용 화면) 양쪽에 "이 게임 키면 이 패널"
 * 조건부 렌더 6줄이 그대로 반복돼서 여기로 모았다.
 */
import type { ComponentType } from 'react'
import { BingoPanel } from './bingo/BingoPanel'
import { WordChainPanel } from './wordchain/WordChainPanel'
import { OmokPanel } from './omok/OmokPanel'
import { TicTacToePanel } from './tictactoe/TicTacToePanel'
import { BalancePanel } from './balance/BalancePanel'
import { ChosungPanel } from './chosung/ChosungPanel'
import type { GameKind } from './gameKinds'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'

export interface GamePanelProps {
  channelId: number
  subscribe: Subscribe
}

export const PANELS: Record<GameKind, ComponentType<GamePanelProps>> = {
  bingo: BingoPanel,
  wordchain: WordChainPanel,
  omok: OmokPanel,
  tictactoe: TicTacToePanel,
  balance: BalancePanel,
  chosung: ChosungPanel,
}

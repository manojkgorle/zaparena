export enum GameType {
  CoinFlip = 0,
  RPS = 1,
  PricePrediction = 2,
}

export enum GameStatus {
  Open = 0,
  Active = 1,
  Resolved = 2,
  Cancelled = 3,
}

export interface Game {
  id: string;
  onChainId?: number;
  gameType: GameType;
  creator: string;
  joiner?: string;
  wagerToken: "STRK" | "ETH";
  wagerAmount: string;
  status: GameStatus;
  winner?: string;
  txHash?: string;
  resolveTxHash?: string;
  createdAt: number;
  // RPS
  creatorCommitted?: boolean;
  joinerCommitted?: boolean;
  creatorMove?: number;
  joinerMove?: number;
  // Price Prediction (multiplayer)
  targetToken?: string;
  predictionCreator?: "up" | "down";
  predictionJoiner?: "up" | "down";
  startPrice?: number;
  endPrice?: number;
  resolvesAt?: number;
  upPlayers?: string[];
  downPlayers?: string[];
  winners?: string[];
}

export interface LeaderboardEntry {
  address: string;
  wins: number;
  gamesPlayed: number;
}

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  [GameType.CoinFlip]: "Coin Flip",
  [GameType.RPS]: "Rock Paper Scissors",
  [GameType.PricePrediction]: "Price Prediction",
};

export const GAME_TYPE_ICONS: Record<GameType, string> = {
  [GameType.CoinFlip]: "🪙",
  [GameType.RPS]: "✊",
  [GameType.PricePrediction]: "📈",
};

"use client";

import Link from "next/link";
import { Game, GameType, GAME_TYPE_LABELS, GAME_TYPE_ICONS, GameStatus } from "@/lib/types";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function GameCard({ game }: { game: Game }) {
  const isOpen = game.status === GameStatus.Open;

  return (
    <Link href={`/game/${game.id}`}>
      <div className="bg-arena-card border border-arena-border rounded-xl p-5 hover:border-arena-accent/50 transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{GAME_TYPE_ICONS[game.gameType]}</span>
            <span className="text-sm font-semibold text-arena-text">
              {GAME_TYPE_LABELS[game.gameType]}
            </span>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              isOpen
                ? "bg-arena-accent/10 text-arena-accent"
                : "bg-arena-purple/10 text-arena-purple"
            }`}
          >
            {isOpen ? "Open" : game.status === GameStatus.Active ? "In Progress" : "Resolved"}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-arena-muted mb-1">Wager</p>
            <p className="text-lg font-bold text-arena-accent font-display">
              {game.wagerAmount} {game.wagerToken}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-arena-muted mb-1">
              by {truncateAddress(game.creator)}
            </p>
            <p className="text-xs text-arena-muted">{timeAgo(game.createdAt)}</p>
          </div>
        </div>
        {game.gameType === GameType.PricePrediction && (
          <div className="mt-3 flex gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-arena-accent/10 text-arena-accent">
              📈 {(game.upPlayers || []).length} UP
            </span>
            <span className="px-2 py-1 rounded bg-arena-danger/10 text-arena-danger">
              📉 {(game.downPlayers || []).length} DOWN
            </span>
          </div>
        )}
        {isOpen && (
          <div className="mt-3">
            <div className="w-full py-2 text-center text-sm font-semibold rounded-lg bg-arena-accent/10 text-arena-accent group-hover:bg-arena-accent group-hover:text-black transition-all">
              {game.gameType === GameType.PricePrediction ? "Place Bet" : "Join Game"}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

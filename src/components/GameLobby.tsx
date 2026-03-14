"use client";

import { useState, useEffect } from "react";
import { Game, GameType, GAME_TYPE_LABELS, GAME_TYPE_ICONS } from "@/lib/types";
import { GameCard } from "./GameCard";

const FILTERS = [
  { label: "All Games", value: null },
  { label: GAME_TYPE_ICONS[GameType.CoinFlip] + " Coin Flip", value: GameType.CoinFlip },
  { label: GAME_TYPE_ICONS[GameType.RPS] + " RPS", value: GameType.RPS },
  { label: GAME_TYPE_ICONS[GameType.PricePrediction] + " Prediction", value: GameType.PricePrediction },
];

export function GameLobby() {
  const [games, setGames] = useState<Game[]>([]);
  const [filter, setFilter] = useState<GameType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/games?status=0");
      const data = await res.json();
      setGames(data.games || []);
    } catch {
      // silent fail for polling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter !== null ? games.filter((g) => g.gameType === filter) : games;

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.value
                ? "bg-arena-accent text-black"
                : "bg-arena-card border border-arena-border text-arena-muted hover:text-arena-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-arena-card border border-arena-border rounded-xl p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🎮</p>
          <p className="text-arena-muted text-lg">No open games yet.</p>
          <p className="text-arena-muted text-sm mt-1">Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}

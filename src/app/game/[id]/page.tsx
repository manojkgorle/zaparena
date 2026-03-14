"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Game, GameType } from "@/lib/types";
import { CoinFlipGame } from "@/components/CoinFlipGame";
import { RPSGame } from "@/components/RPSGame";
import { PricePredictionGame } from "@/components/PricePredictionGame";

export default function GamePage() {
  const params = useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${params.id}`);
      if (!res.ok) throw new Error("Game not found");
      const data = await res.json();
      setGame(data.game);
    } catch {
      setError("Game not found");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 1000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-pulse text-4xl mb-4">🎮</div>
        <p className="text-arena-muted">Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">😵</p>
        <p className="text-arena-danger text-lg">{error || "Game not found"}</p>
      </div>
    );
  }

  const GameComponent = {
    [GameType.CoinFlip]: CoinFlipGame,
    [GameType.RPS]: RPSGame,
    [GameType.PricePrediction]: PricePredictionGame,
  }[game.gameType];

  return (
    <div className="max-w-xl mx-auto">
      <GameComponent game={game} onUpdate={fetchGame} />
    </div>
  );
}

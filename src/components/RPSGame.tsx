"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/useWallet";
import { Game, GameStatus } from "@/lib/types";
import { ESCROW_CONTRACT, TOKEN_ADDRESSES, TOKEN_DECIMALS } from "@/lib/constants";
import { uint256 } from "starknet";
import { GameResult } from "./GameResult";

const MOVES = [
  { value: 1, label: "Rock", icon: "🪨" },
  { value: 2, label: "Paper", icon: "📄" },
  { value: 3, label: "Scissors", icon: "✂️" },
];

export function RPSGame({
  game,
  onUpdate,
}: {
  game: Game;
  onUpdate: () => void;
}) {
  const { account, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCreator = address?.toLowerCase() === game.creator.toLowerCase();
  const isJoiner = game.joiner && address?.toLowerCase() === game.joiner.toLowerCase();
  const isPlayer = isCreator || isJoiner;

  // Check if we already submitted a move
  useEffect(() => {
    if (!address) return;
    const stored = localStorage.getItem(`rps-${game.id}-${address}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setSelectedMove(parsed.move);
      setSubmitted(true);
    }
  }, [game.id, address]);

  const handleJoin = async () => {
    if (!account || !address) return;
    setLoading(true);
    setError("");

    try {
      const decimals = TOKEN_DECIMALS[game.wagerToken];
      const rawAmount = BigInt(Math.floor(parseFloat(game.wagerAmount) * 10 ** decimals));
      const tokenAddress = TOKEN_ADDRESSES[game.wagerToken];
      const u256Amount = uint256.bnToUint256(rawAmount);

      const tx = await account.execute([
        {
          contractAddress: tokenAddress,
          entrypoint: "approve",
          calldata: [ESCROW_CONTRACT, u256Amount.low.toString(), u256Amount.high.toString()],
        },
        {
          contractAddress: ESCROW_CONTRACT,
          entrypoint: "join_game",
          calldata: [String(game.onChainId)],
        },
      ]);

      await fetch(`/api/games/${game.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joiner: address, txHash: tx.transaction_hash }),
      });

      onUpdate();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to join game");
    } finally {
      setLoading(false);
    }
  };

  const handlePickMove = async (move: number) => {
    if (!address) return;
    setLoading(true);
    setError("");

    try {
      // Store move locally
      localStorage.setItem(
        `rps-${game.id}-${address}`,
        JSON.stringify({ move })
      );
      setSelectedMove(move);
      setSubmitted(true);

      // Submit move to server (server holds moves until both submitted, then resolves)
      await fetch(`/api/games/${game.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: address, action: "reveal", move }),
      });

      onUpdate();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit move");
    } finally {
      setLoading(false);
    }
  };

  if (game.status === GameStatus.Resolved) {
    return <GameResult game={game} />;
  }

  // Waiting for opponent
  if (game.status === GameStatus.Open) {
    return (
      <div className="text-center py-8">
        <div className="text-8xl mb-6">✊</div>
        <h2 className="text-2xl font-bold font-display mb-2">Rock Paper Scissors</h2>
        <p className="text-arena-muted mb-2">
          Wager: <span className="text-arena-accent font-bold">{game.wagerAmount} {game.wagerToken}</span>
        </p>

        {isCreator ? (
          <div className="mt-8 animate-pulse-glow inline-block px-8 py-4 rounded-xl bg-arena-card border border-arena-border">
            <p className="text-arena-muted mb-2">Waiting for an opponent...</p>
            <p className="text-xs text-arena-muted">
              Share this link with a friend!
            </p>
          </div>
        ) : (
          <div className="mt-8">
            {error && <p className="text-arena-danger text-sm mb-4">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading || !account}
              className="px-8 py-4 rounded-xl bg-arena-accent text-black font-bold text-lg font-display hover:bg-arena-accent/90 transition-all disabled:opacity-50"
            >
              {loading ? "Joining..." : `Join for ${game.wagerAmount} ${game.wagerToken}`}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Active game — pick your move
  return (
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold font-display mb-2">Rock Paper Scissors</h2>
      <p className="text-arena-muted mb-6">
        Wager: <span className="text-arena-accent font-bold">{game.wagerAmount} {game.wagerToken}</span>
      </p>

      {error && <p className="text-arena-danger text-sm mb-4">{error}</p>}

      {!isPlayer ? (
        <p className="text-arena-muted">Spectating this game...</p>
      ) : !submitted ? (
        <div>
          <p className="text-arena-muted mb-4">Choose your move:</p>
          <div className="flex justify-center gap-4">
            {MOVES.map((m) => (
              <button
                key={m.value}
                onClick={() => handlePickMove(m.value)}
                disabled={loading}
                className="w-28 h-28 rounded-2xl bg-arena-card border border-arena-border hover:border-arena-accent hover:bg-arena-accent/10 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="text-4xl">{m.icon}</span>
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-arena-muted mb-2">
            You picked: <span className="text-4xl">{MOVES.find((m) => m.value === selectedMove)?.icon}</span>
          </p>
          <div className="mt-4 animate-pulse-glow inline-block px-8 py-4 rounded-xl bg-arena-card border border-arena-border">
            <p className="text-arena-muted">Waiting for opponent to pick...</p>
          </div>
        </div>
      )}
    </div>
  );
}

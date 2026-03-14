"use client";

import { useState } from "react";
import { useWallet } from "@/lib/useWallet";
import { Game, GameStatus } from "@/lib/types";
import { ESCROW_CONTRACT, TOKEN_ADDRESSES, TOKEN_DECIMALS } from "@/lib/constants";
import { uint256 } from "starknet";
import { GameResult } from "./GameResult";

export function CoinFlipGame({
  game,
  onUpdate,
}: {
  game: Game;
  onUpdate: () => void;
}) {
  const { account, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [error, setError] = useState("");

  const isCreator = address?.toLowerCase() === game.creator.toLowerCase();
  const isJoiner = game.joiner && address?.toLowerCase() === game.joiner.toLowerCase();

  const handleJoin = async () => {
    if (!address) return;
    setLoading(true);
    setError("");

    try {
      let txHash: string | undefined;

      // On-chain join only if we have a Starknet account
      if (account && game.onChainId) {
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
        txHash = tx.transaction_hash;
      }

      setFlipping(true);

      await fetch(`/api/games/${game.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joiner: address, txHash }),
      });

      await new Promise((r) => setTimeout(r, 2500));
      setFlipping(false);
      onUpdate();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to join game");
    } finally {
      setLoading(false);
    }
  };

  if (game.status === GameStatus.Resolved) {
    return <GameResult game={game} />;
  }

  if (flipping) {
    return (
      <div className="text-center py-16">
        <div className="inline-block text-8xl animate-flip" style={{ perspective: "1000px" }}>
          🪙
        </div>
        <p className="text-arena-muted mt-6 text-lg">Flipping the coin...</p>
      </div>
    );
  }

  if (game.status === GameStatus.Open) {
    return (
      <div className="text-center py-8">
        <div className="text-8xl mb-6">🪙</div>
        <h2 className="text-2xl font-bold font-display mb-2">Coin Flip</h2>
        <p className="text-arena-muted mb-2">
          Wager: <span className="text-arena-accent font-bold">{game.wagerAmount} {game.wagerToken}</span>
        </p>

        {isCreator ? (
          <div className="mt-8">
            <div className="animate-pulse-glow inline-block px-8 py-4 rounded-xl bg-arena-card border border-arena-border">
              <p className="text-arena-muted mb-2">Waiting for an opponent...</p>
              <p className="text-xs text-arena-muted">
                Share this link: <span className="text-arena-accent font-mono">{typeof window !== "undefined" ? window.location.href : ""}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            {error && (
              <p className="text-arena-danger text-sm mb-4">{error}</p>
            )}
            <button
              onClick={handleJoin}
              disabled={loading || !address}
              className="px-8 py-4 rounded-xl bg-arena-accent text-black font-bold text-lg font-display hover:bg-arena-accent/90 transition-all disabled:opacity-50"
            >
              {loading ? "Joining..." : `Join for ${game.wagerAmount} ${game.wagerToken}`}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Active state (waiting for resolution)
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">⏳</div>
      <p className="text-arena-muted">Resolving game...</p>
    </div>
  );
}

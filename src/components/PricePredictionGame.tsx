"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/useWallet";
import { uint256 } from "starknet";
import { Game, GameStatus } from "@/lib/types";
import { ESCROW_CONTRACT, TOKEN_ADDRESSES, TOKEN_DECIMALS } from "@/lib/constants";
import { GameResult } from "./GameResult";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function PricePredictionGame({
  game,
  onUpdate,
}: {
  game: Game;
  onUpdate: () => void;
}) {
  const { account, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const upPlayers = game.upPlayers || [];
  const downPlayers = game.downPlayers || [];
  const totalPlayers = upPlayers.length + downPlayers.length;
  const isInGame = address && [...upPlayers, ...downPlayers].some(
    (p) => p.toLowerCase() === address.toLowerCase()
  );
  const mySide = address
    ? upPlayers.some((p) => p.toLowerCase() === address.toLowerCase())
      ? "up"
      : downPlayers.some((p) => p.toLowerCase() === address.toLowerCase())
        ? "down"
        : null
    : null;

  // Fetch current price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/price?token=${game.targetToken || "BTC"}`);
        const data = await res.json();
        setCurrentPrice(data.price);
      } catch {
        // silent
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, [game.targetToken]);

  // Countdown timer
  useEffect(() => {
    if (!game.resolvesAt) return;
    const update = () => {
      const left = Math.max(0, Math.floor((game.resolvesAt! - Date.now()) / 1000));
      setTimeLeft(left);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [game.resolvesAt]);

  // Trigger resolution when timer hits 0
  const triggerResolve = useCallback(async () => {
    try {
      await fetch(`/api/games/${game.id}/resolve`, { method: "POST" });
    } catch { /* retry on next poll */ }
    onUpdate();
  }, [game.id, onUpdate]);

  useEffect(() => {
    if (timeLeft === 0 && (game.status === GameStatus.Active || game.status === GameStatus.Open) && totalPlayers >= 2) {
      triggerResolve(); // resolve immediately, no delay
    }
  }, [timeLeft, game.status, totalPlayers, triggerResolve]);

  const handleJoinSide = async (side: "up" | "down") => {
    if (!address) return;
    setLoading(true);
    setError("");

    try {
      // On-chain: only if we have a Starknet account
      if (account && game.onChainId) {
        const decimals = TOKEN_DECIMALS[game.wagerToken];
        const rawAmount = BigInt(Math.floor(parseFloat(game.wagerAmount) * 10 ** decimals));
        const tokenAddress = TOKEN_ADDRESSES[game.wagerToken];
        const u256Amount = uint256.bnToUint256(rawAmount);

        await account.execute([
          {
            contractAddress: tokenAddress,
            entrypoint: "approve",
            calldata: [ESCROW_CONTRACT, u256Amount.low.toString(), u256Amount.high.toString()],
          },
          {
            contractAddress: ESCROW_CONTRACT,
            entrypoint: "join_prediction",
            calldata: [String(game.onChainId)],
          },
        ]);
      }

      // Register side in API
      await fetch(`/api/games/${game.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joiner: address, side }),
      });

      onUpdate();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  if (game.status === GameStatus.Resolved) {
    return <PredictionResult game={game} />;
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const wager = parseFloat(game.wagerAmount);
  const totalPool = totalPlayers * wager;

  return (
    <div className="text-center py-8">
      <div className="text-6xl mb-4">📈</div>
      <h2 className="text-2xl font-bold font-display mb-1">Price Prediction</h2>
      <p className="text-arena-muted text-sm mb-6">
        Bet per player: <span className="text-arena-accent font-bold">{game.wagerAmount} {game.wagerToken}</span>
        {" | "}
        Total pool: <span className="text-arena-accent font-bold">{totalPool.toFixed(2)} {game.wagerToken}</span>
      </p>

      {/* Price display */}
      <div className="inline-block bg-arena-card border border-arena-border rounded-xl p-5 mb-6">
        <p className="text-sm text-arena-muted mb-1">{game.targetToken || "BTC"} Price</p>
        {currentPrice !== null ? (
          <p className="text-3xl font-bold font-mono text-arena-text">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        ) : (
          <p className="text-xl text-arena-muted">Loading...</p>
        )}
        {game.startPrice && (
          <p className="text-xs text-arena-muted mt-1">
            Start: ${game.startPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {currentPrice && (
              <span className={currentPrice >= game.startPrice ? " text-arena-accent" : " text-arena-danger"}>
                {" "}({((currentPrice - game.startPrice) / game.startPrice * 100).toFixed(2)}%)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Timer */}
      {game.resolvesAt && (
        <div className="mb-6">
          <p className="text-sm text-arena-muted mb-1">
            {timeLeft > 0 ? "Resolves in" : "Resolving..."}
          </p>
          <p className="text-3xl font-bold font-mono text-arena-accent">
            {timeLeft > 0 ? formatTime(timeLeft) : "0:00"}
          </p>
        </div>
      )}

      {error && <p className="text-arena-danger text-sm mb-4">{error}</p>}

      {/* Two sides */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* UP side */}
        <div className={`rounded-xl border p-4 ${mySide === "up" ? "border-arena-accent bg-arena-accent/10" : "border-arena-border bg-arena-card"}`}>
          <p className="text-2xl mb-2">📈</p>
          <p className="text-lg font-bold text-arena-accent mb-1">UP</p>
          <p className="text-2xl font-bold font-display text-arena-text">{upPlayers.length}</p>
          <p className="text-xs text-arena-muted mb-3">
            {upPlayers.length === 1 ? "player" : "players"}
          </p>
          {upPlayers.length > 0 && (
            <div className="text-xs text-arena-muted space-y-1 mb-3">
              {upPlayers.slice(0, 5).map((p) => (
                <p key={p} className="font-mono">{truncateAddress(p)}</p>
              ))}
              {upPlayers.length > 5 && <p>+{upPlayers.length - 5} more</p>}
            </div>
          )}
          {!isInGame && timeLeft > 0 && (
            <button
              onClick={() => handleJoinSide("up")}
              disabled={loading || !address}
              className="w-full py-2 rounded-lg bg-arena-accent text-black font-bold text-sm hover:bg-arena-accent/90 transition-all disabled:opacity-50"
            >
              {loading ? "..." : `Bet UP (${game.wagerAmount} ${game.wagerToken})`}
            </button>
          )}
          {mySide === "up" && (
            <p className="text-xs text-arena-accent font-bold mt-1">Your bet</p>
          )}
        </div>

        {/* DOWN side */}
        <div className={`rounded-xl border p-4 ${mySide === "down" ? "border-arena-danger bg-arena-danger/10" : "border-arena-border bg-arena-card"}`}>
          <p className="text-2xl mb-2">📉</p>
          <p className="text-lg font-bold text-arena-danger mb-1">DOWN</p>
          <p className="text-2xl font-bold font-display text-arena-text">{downPlayers.length}</p>
          <p className="text-xs text-arena-muted mb-3">
            {downPlayers.length === 1 ? "player" : "players"}
          </p>
          {downPlayers.length > 0 && (
            <div className="text-xs text-arena-muted space-y-1 mb-3">
              {downPlayers.slice(0, 5).map((p) => (
                <p key={p} className="font-mono">{truncateAddress(p)}</p>
              ))}
              {downPlayers.length > 5 && <p>+{downPlayers.length - 5} more</p>}
            </div>
          )}
          {!isInGame && timeLeft > 0 && (
            <button
              onClick={() => handleJoinSide("down")}
              disabled={loading || !address}
              className="w-full py-2 rounded-lg bg-arena-danger text-white font-bold text-sm hover:bg-arena-danger/90 transition-all disabled:opacity-50"
            >
              {loading ? "..." : `Bet DOWN (${game.wagerAmount} ${game.wagerToken})`}
            </button>
          )}
          {mySide === "down" && (
            <p className="text-xs text-arena-danger font-bold mt-1">Your bet</p>
          )}
        </div>
      </div>

      {/* Potential payout */}
      {isInGame && (
        <div className="bg-arena-card border border-arena-border rounded-xl p-3 inline-block">
          <p className="text-xs text-arena-muted">
            If you win:{" "}
            <span className="text-arena-accent font-bold">
              {mySide === "up" && downPlayers.length > 0
                ? (wager + (downPlayers.length * wager) / upPlayers.length).toFixed(4)
                : mySide === "down" && upPlayers.length > 0
                  ? (wager + (upPlayers.length * wager) / downPlayers.length).toFixed(4)
                  : wager.toFixed(4)
              } {game.wagerToken}
            </span>
            {" "}(+{mySide === "up" && downPlayers.length > 0
              ? ((downPlayers.length * wager) / upPlayers.length).toFixed(4)
              : mySide === "down" && upPlayers.length > 0
                ? ((upPlayers.length * wager) / downPlayers.length).toFixed(4)
                : "0"
            } profit)
          </p>
        </div>
      )}
    </div>
  );
}

function PredictionResult({ game }: { game: Game }) {
  const { address } = useWallet();
  const upPlayers = game.upPlayers || [];
  const downPlayers = game.downPlayers || [];
  const winners = game.winners || [];
  const wager = parseFloat(game.wagerAmount);
  const totalPool = (upPlayers.length + downPlayers.length) * wager;
  const losersCount = upPlayers.length + downPlayers.length - winners.length;
  const profitPerWinner = winners.length > 0 ? (losersCount * wager) / winners.length : 0;

  const isWinner = address && winners.some((w) => w.toLowerCase() === address.toLowerCase());
  const isInGame = address && [...upPlayers, ...downPlayers].some(
    (p) => p.toLowerCase() === address.toLowerCase()
  );
  const priceWentUp = (game.endPrice || 0) >= (game.startPrice || 0);

  return (
    <div className="text-center py-8">
      <div className="text-6xl mb-4">{priceWentUp ? "📈" : "📉"}</div>
      <h2 className="text-2xl font-bold font-display mb-1">
        {game.targetToken} went {priceWentUp ? "UP" : "DOWN"}!
      </h2>
      <p className="text-arena-muted text-sm mb-4">
        ${game.startPrice?.toFixed(2)} → ${game.endPrice?.toFixed(2)}
        <span className={priceWentUp ? " text-arena-accent" : " text-arena-danger"}>
          {" "}({(((game.endPrice || 0) - (game.startPrice || 0)) / (game.startPrice || 1) * 100).toFixed(2)}%)
        </span>
      </p>

      {isWinner ? (
        <div className="mb-6">
          <p className="text-4xl font-bold text-arena-accent font-display mb-1">You Won!</p>
          <p className="text-lg text-arena-muted">
            +{profitPerWinner.toFixed(4)} {game.wagerToken} profit
          </p>
        </div>
      ) : isInGame ? (
        <div className="mb-6">
          <p className="text-4xl font-bold text-arena-danger font-display mb-1">You Lost</p>
          <p className="text-lg text-arena-muted">
            -{game.wagerAmount} {game.wagerToken}
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-2xl font-bold text-arena-text font-display">Game Over</p>
        </div>
      )}

      <div className="bg-arena-card border border-arena-border rounded-xl p-4 inline-block mb-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <span className="text-arena-muted text-right">Total pool:</span>
          <span className="text-arena-accent font-bold text-left">{totalPool.toFixed(2)} {game.wagerToken}</span>
          <span className="text-arena-muted text-right">Winners:</span>
          <span className="text-arena-text text-left">{winners.length} players</span>
          <span className="text-arena-muted text-right">Losers:</span>
          <span className="text-arena-text text-left">{losersCount} players</span>
          <span className="text-arena-muted text-right">Profit/winner:</span>
          <span className="text-arena-accent font-bold text-left">+{profitPerWinner.toFixed(4)} {game.wagerToken}</span>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <a href="/" className="px-6 py-3 rounded-xl bg-arena-card border border-arena-border text-arena-text font-semibold hover:border-arena-accent/50 transition-all">
          Back to Lobby
        </a>
        <a href="/create" className="px-6 py-3 rounded-xl bg-arena-accent text-black font-semibold hover:bg-arena-accent/90 transition-all">
          Play Again
        </a>
      </div>
    </div>
  );
}

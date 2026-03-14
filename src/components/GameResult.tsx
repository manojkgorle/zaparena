"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/useWallet";
import Link from "next/link";
import { Game, GAME_TYPE_LABELS, GAME_TYPE_ICONS } from "@/lib/types";

function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  useEffect(() => {
    const colors = ["#00ff88", "#8b5cf6", "#ff6b35", "#fbbf24", "#ef4444"];
    setParticles(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
    );
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            backgroundColor: p.color,
            animation: `confetti-fall 3s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function GameResult({ game }: { game: Game }) {
  const { address } = useWallet();
  const isWinner = address && game.winner && address.toLowerCase() === game.winner.toLowerCase();
  const pot = (parseFloat(game.wagerAmount) * 2).toFixed(4);

  return (
    <div className="text-center py-8">
      {isWinner && <Confetti />}

      <div className="text-8xl mb-6">{GAME_TYPE_ICONS[game.gameType]}</div>

      <h2 className="text-2xl font-bold font-display mb-1">
        {GAME_TYPE_LABELS[game.gameType]}
      </h2>

      <div className="mt-6 mb-8">
        {isWinner ? (
          <>
            <p className="text-5xl font-bold text-arena-accent font-display mb-2">
              You Won!
            </p>
            <p className="text-xl text-arena-muted">
              +{pot} {game.wagerToken}
            </p>
          </>
        ) : address && (address.toLowerCase() === game.creator.toLowerCase() || address.toLowerCase() === game.joiner?.toLowerCase()) ? (
          <>
            <p className="text-5xl font-bold text-arena-danger font-display mb-2">
              You Lost
            </p>
            <p className="text-xl text-arena-muted">
              -{game.wagerAmount} {game.wagerToken}
            </p>
          </>
        ) : (
          <>
            <p className="text-3xl font-bold text-arena-text font-display mb-2">
              Game Over
            </p>
            <p className="text-arena-muted">
              Winner: {game.winner ? truncateAddress(game.winner) : "Unknown"}
            </p>
          </>
        )}
      </div>

      <div className="bg-arena-card border border-arena-border rounded-xl p-4 inline-block mb-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <span className="text-arena-muted text-right">Pot:</span>
          <span className="text-arena-accent font-bold text-left">{pot} {game.wagerToken}</span>
          <span className="text-arena-muted text-right">Winner:</span>
          <span className="text-arena-text text-left font-mono text-xs">
            {game.winner ? truncateAddress(game.winner) : "-"}
          </span>
          {game.resolveTxHash && (
            <>
              <span className="text-arena-muted text-right">Tx:</span>
              <span className="text-arena-purple text-left font-mono text-xs">
                {truncateAddress(game.resolveTxHash)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-arena-card border border-arena-border text-arena-text font-semibold hover:border-arena-accent/50 transition-all"
        >
          Back to Lobby
        </Link>
        <Link
          href="/create"
          className="px-6 py-3 rounded-xl bg-arena-accent text-black font-semibold hover:bg-arena-accent/90 transition-all"
        >
          Play Again
        </Link>
      </div>
    </div>
  );
}

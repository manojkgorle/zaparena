"use client";

import { useState, useEffect } from "react";
import { LeaderboardEntry } from "@/lib/types";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const RANK_BADGES = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        setEntries(data.entries || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-64 bg-arena-card rounded-xl" />;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🏆</p>
        <p className="text-arena-muted text-lg">No games played yet.</p>
        <p className="text-arena-muted text-sm mt-1">Be the first champion!</p>
      </div>
    );
  }

  return (
    <div className="bg-arena-card border border-arena-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-arena-border">
            <th className="text-left px-6 py-4 text-sm text-arena-muted font-medium">Rank</th>
            <th className="text-left px-6 py-4 text-sm text-arena-muted font-medium">Player</th>
            <th className="text-right px-6 py-4 text-sm text-arena-muted font-medium">Wins</th>
            <th className="text-right px-6 py-4 text-sm text-arena-muted font-medium">Games</th>
            <th className="text-right px-6 py-4 text-sm text-arena-muted font-medium">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={entry.address}
              className="border-b border-arena-border/50 hover:bg-arena-border/20 transition-colors"
            >
              <td className="px-6 py-4">
                <span className="text-lg">
                  {RANK_BADGES[i] || <span className="text-sm text-arena-muted">#{i + 1}</span>}
                </span>
              </td>
              <td className="px-6 py-4 font-mono text-sm text-arena-text">
                {truncateAddress(entry.address)}
              </td>
              <td className="px-6 py-4 text-right font-bold text-arena-accent">
                {entry.wins}
              </td>
              <td className="px-6 py-4 text-right text-arena-muted">
                {entry.gamesPlayed}
              </td>
              <td className="px-6 py-4 text-right text-arena-purple font-medium">
                {entry.gamesPlayed > 0
                  ? `${Math.round((entry.wins / entry.gamesPlayed) * 100)}%`
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ConnectButton } from "./ConnectButton";

export function Navbar() {
  return (
    <nav className="border-b border-arena-border bg-arena-bg/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold font-display">
              <span className="text-arena-accent">Zap</span>
              <span className="text-arena-text">Arena</span>
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-arena-muted hover:text-arena-text transition-colors"
            >
              Lobby
            </Link>
            <Link
              href="/create"
              className="text-sm text-arena-muted hover:text-arena-text transition-colors"
            >
              Create Game
            </Link>
            <Link
              href="/leaderboard"
              className="text-sm text-arena-muted hover:text-arena-text transition-colors"
            >
              Leaderboard
            </Link>
          </div>
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}

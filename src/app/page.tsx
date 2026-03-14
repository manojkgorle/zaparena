import Link from "next/link";
import { GameLobby } from "@/components/GameLobby";

export default function Home() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">
            Game <span className="text-arena-accent">Lobby</span>
          </h1>
          <p className="text-arena-muted mt-1">Join an open game or create your own challenge</p>
        </div>
        <Link
          href="/create"
          className="px-6 py-3 rounded-xl bg-arena-accent text-black font-semibold hover:bg-arena-accent/90 transition-all font-display"
        >
          + Create Game
        </Link>
      </div>
      <GameLobby />
    </div>
  );
}

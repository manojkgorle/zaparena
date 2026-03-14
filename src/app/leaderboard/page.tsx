import { Leaderboard } from "@/components/Leaderboard";

export default function LeaderboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold font-display mb-8">
        Leader<span className="text-arena-accent">board</span>
      </h1>
      <Leaderboard />
    </div>
  );
}

import { Game, GameStatus, LeaderboardEntry } from "./types";

// Use globalThis to persist across Next.js hot reloads and route modules
const globalStore = globalThis as unknown as {
  __zaparena_games?: Map<string, Game>;
  __zaparena_nextId?: number;
};

if (!globalStore.__zaparena_games) {
  globalStore.__zaparena_games = new Map<string, Game>();
}
if (!globalStore.__zaparena_nextId) {
  globalStore.__zaparena_nextId = 1;
}

const games = globalStore.__zaparena_games;

export function createGame(game: Omit<Game, "id">): Game {
  const id = String(globalStore.__zaparena_nextId!++);
  const newGame: Game = { ...game, id };
  games.set(id, newGame);
  return newGame;
}

export function getGame(id: string): Game | undefined {
  return games.get(id);
}

export function listGames(status?: GameStatus): Game[] {
  const all = Array.from(games.values());
  if (status !== undefined) {
    return all.filter((g) => g.status === status).sort((a, b) => b.createdAt - a.createdAt);
  }
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export function updateGame(id: string, updates: Partial<Game>): Game | undefined {
  const game = games.get(id);
  if (!game) return undefined;
  const updated = { ...game, ...updates };
  games.set(id, updated);
  return updated;
}

export function getLeaderboard(): LeaderboardEntry[] {
  const stats = new Map<string, { wins: number; gamesPlayed: number }>();

  for (const game of games.values()) {
    if (game.status !== GameStatus.Resolved) continue;

    const addPlayer = (addr: string) => {
      if (!stats.has(addr)) stats.set(addr, { wins: 0, gamesPlayed: 0 });
      stats.get(addr)!.gamesPlayed++;
    };

    addPlayer(game.creator);
    if (game.joiner) addPlayer(game.joiner);

    // For multiplayer prediction games
    for (const p of game.upPlayers || []) {
      if (p !== game.creator) addPlayer(p);
    }
    for (const p of game.downPlayers || []) {
      if (p !== game.creator) addPlayer(p);
    }

    // Track winners
    if (game.winners && game.winners.length > 0) {
      for (const w of game.winners) {
        if (!stats.has(w)) stats.set(w, { wins: 0, gamesPlayed: 0 });
        stats.get(w)!.wins++;
      }
    } else if (game.winner) {
      if (!stats.has(game.winner)) stats.set(game.winner, { wins: 0, gamesPlayed: 0 });
      stats.get(game.winner)!.wins++;
    }
  }

  return Array.from(stats.entries())
    .map(([address, s]) => ({ address, ...s }))
    .sort((a, b) => b.wins - a.wins);
}

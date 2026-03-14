import { NextRequest, NextResponse } from "next/server";
import { getGame, updateGame } from "@/lib/db";
import { GameStatus } from "@/lib/types";
import { resolveGame } from "@/lib/resolver";

// RPS move values: 1=Rock, 2=Paper, 3=Scissors
function getRPSWinner(move1: number, move2: number, player1: string, player2: string): string | null {
  if (move1 === move2) return null; // draw
  if (
    (move1 === 1 && move2 === 3) ||
    (move1 === 2 && move2 === 1) ||
    (move1 === 3 && move2 === 2)
  ) {
    return player1;
  }
  return player2;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { player, action, move } = body;

  const game = getGame(id);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const isCreator = player.toLowerCase() === game.creator.toLowerCase();

  if (action === "commit") {
    const updates = isCreator
      ? { creatorCommitted: true }
      : { joinerCommitted: true };
    const updated = updateGame(id, updates);
    return NextResponse.json({ game: updated });
  }

  if (action === "reveal") {
    const updates = isCreator
      ? { creatorMove: move }
      : { joinerMove: move };
    const updated = updateGame(id, updates);

    // Check if both revealed
    if (updated && updated.creatorMove && updated.joinerMove) {
      const winner = getRPSWinner(
        updated.creatorMove,
        updated.joinerMove,
        updated.creator,
        updated.joiner!
      );

      if (winner) {
        const resolved = await resolveGame(id, winner);
        return NextResponse.json({ game: resolved });
      } else {
        // Draw - resolve in favor of creator (simplified for hackathon)
        const resolved = await resolveGame(id, updated.creator);
        return NextResponse.json({ game: resolved });
      }
    }

    return NextResponse.json({ game: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

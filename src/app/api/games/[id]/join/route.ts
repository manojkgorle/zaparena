import { NextRequest, NextResponse } from "next/server";
import { getGame, updateGame } from "@/lib/db";
import { GameStatus, GameType } from "@/lib/types";
import { resolveGame } from "@/lib/resolver";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const game = getGame(id);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Price Prediction: multiplayer — allow joins until timer expires
  if (game.gameType === GameType.PricePrediction) {
    if (game.status === GameStatus.Resolved || game.status === GameStatus.Cancelled) {
      return NextResponse.json({ error: "Game is over" }, { status: 400 });
    }
    if (game.resolvesAt && Date.now() > game.resolvesAt) {
      return NextResponse.json({ error: "Betting is closed" }, { status: 400 });
    }

    const side: "up" | "down" = body.side;
    const player: string = body.joiner;

    // Check if already joined
    const allPlayers = [...(game.upPlayers || []), ...(game.downPlayers || [])];
    if (allPlayers.some((p) => p.toLowerCase() === player.toLowerCase())) {
      return NextResponse.json({ error: "Already in this game" }, { status: 400 });
    }

    const upPlayers = [...(game.upPlayers || [])];
    const downPlayers = [...(game.downPlayers || [])];

    if (side === "up") {
      upPlayers.push(player);
    } else {
      downPlayers.push(player);
    }

    const updated = updateGame(id, {
      upPlayers,
      downPlayers,
    });

    return NextResponse.json({ game: updated });
  }

  // CoinFlip / RPS: 1v1 join
  if (game.status !== GameStatus.Open) {
    return NextResponse.json({ error: "Game not open" }, { status: 400 });
  }

  const updated = updateGame(id, {
    joiner: body.joiner,
    status: GameStatus.Active,
  });

  // For CoinFlip, resolve immediately
  if (game.gameType === GameType.CoinFlip && updated) {
    const winner = Math.random() < 0.5 ? updated.creator : updated.joiner!;
    const resolved = await resolveGame(id, winner);
    return NextResponse.json({ game: resolved });
  }

  return NextResponse.json({ game: updated });
}

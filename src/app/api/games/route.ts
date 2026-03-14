import { NextRequest, NextResponse } from "next/server";
import { createGame, listGames } from "@/lib/db";
import { GameStatus, GameType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = statusParam !== null ? parseInt(statusParam) as GameStatus : undefined;
  const games = listGames(status);
  return NextResponse.json({ games });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const game = createGame({
    gameType: body.gameType as GameType,
    creator: body.creator,
    wagerToken: body.wagerToken,
    wagerAmount: body.wagerAmount,
    status: GameStatus.Open,
    txHash: body.txHash,
    onChainId: body.onChainId,
    createdAt: Date.now(),
    ...(body.gameType === GameType.PricePrediction && {
      targetToken: body.targetToken,
      predictionCreator: body.prediction,
      startPrice: body.startPrice,
      resolvesAt: Date.now() + (body.duration || 120) * 1000,
      upPlayers: body.prediction === "up" ? [body.creator] : [],
      downPlayers: body.prediction === "down" ? [body.creator] : [],
    }),
  });

  return NextResponse.json({ game });
}

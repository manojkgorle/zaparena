import { NextRequest, NextResponse } from "next/server";
import { Account, RpcProvider, Signer, CallData } from "starknet";
import { getGame, updateGame } from "@/lib/db";
import { GameStatus, GameType } from "@/lib/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const game = getGame(id);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status === GameStatus.Resolved) {
    return NextResponse.json({ game });
  }
  if (game.gameType !== GameType.PricePrediction) {
    return NextResponse.json({ error: "Not a prediction game" }, { status: 400 });
  }

  // Check if timer has expired
  if (game.resolvesAt && Date.now() < game.resolvesAt) {
    return NextResponse.json({ error: "Timer not expired yet" }, { status: 400 });
  }

  // Need players on both sides
  const upPlayers = game.upPlayers || [];
  const downPlayers = game.downPlayers || [];
  if (upPlayers.length === 0 || downPlayers.length === 0) {
    // Refund — no contest. Just mark cancelled.
    const cancelled = updateGame(id, { status: GameStatus.Cancelled });
    return NextResponse.json({ game: cancelled });
  }

  // Fetch current price
  let endPrice: number;
  try {
    const token = game.targetToken || "BTC";
    const COINGECKO_IDS: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", STRK: "starknet" };
    const coinId = COINGECKO_IDS[token.toUpperCase()] || "bitcoin";

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    const data = await res.json();
    endPrice = data[coinId]?.usd;

    if (!endPrice) {
      const mocks: Record<string, number> = { bitcoin: 67500, ethereum: 3500, starknet: 1.2 };
      endPrice = (mocks[coinId] || 67500) + (Math.random() - 0.5) * 200;
    }
  } catch {
    const mocks: Record<string, number> = { bitcoin: 67500, ethereum: 3500, starknet: 1.2 };
    endPrice = (mocks[game.targetToken || "BTC"] || 67500) + (Math.random() - 0.5) * 200;
  }

  const priceWentUp = endPrice >= (game.startPrice || 0);
  const winners = priceWentUp ? upPlayers : downPlayers;
  const losers = priceWentUp ? downPlayers : upPlayers;

  // Calculate payouts
  // Total pool = (upPlayers.length + downPlayers.length) * wagerAmount
  // Each winner gets: wagerAmount + (losers.length * wagerAmount / winners.length)
  const wager = parseFloat(game.wagerAmount);
  const totalPool = (upPlayers.length + downPlayers.length) * wager;
  const profitPerWinner = (losers.length * wager) / winners.length;
  const payoutPerWinner = wager + profitPerWinner;

  // Resolve on-chain: call resolve_prediction with winners array
  let resolveTxHash: string | undefined;
  if (game.onChainId && process.env.SERVER_WALLET_ADDRESS && process.env.SERVER_WALLET_PRIVATE_KEY) {
    try {
      const provider = new RpcProvider({
        nodeUrl: process.env.STARKNET_RPC_URL || "https://api.cartridge.gg/x/starknet/sepolia",
      });
      const serverAccount = new Account({
        provider,
        address: process.env.SERVER_WALLET_ADDRESS!,
        signer: new Signer(process.env.SERVER_WALLET_PRIVATE_KEY!),
      } as ConstructorParameters<typeof Account>[0]);

      // Build calldata: game_id, then winners array (length + elements)
      const calldata = CallData.compile({
        game_id: game.onChainId,
        winners,
      });

      const tx = await serverAccount.execute({
        contractAddress: process.env.NEXT_PUBLIC_ESCROW_CONTRACT!,
        entrypoint: "resolve_prediction",
        calldata,
      });
      resolveTxHash = tx.transaction_hash;
      console.log(`[resolver] On-chain resolve_prediction tx: ${resolveTxHash}`);
    } catch (err) {
      console.error("[resolver] On-chain resolve_prediction failed:", err);
    }
  }

  const resolved = updateGame(id, {
    status: GameStatus.Resolved,
    endPrice,
    winners,
    winner: winners[0],
    resolveTxHash,
  });

  return NextResponse.json({
    game: resolved,
    result: {
      direction: priceWentUp ? "up" : "down",
      startPrice: game.startPrice,
      endPrice,
      totalPool: totalPool.toFixed(4),
      winnersCount: winners.length,
      losersCount: losers.length,
      payoutPerWinner: payoutPerWinner.toFixed(4),
      profitPerWinner: profitPerWinner.toFixed(4),
    },
  });
}

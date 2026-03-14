import { Account, RpcProvider, Signer, CallData } from "starknet";
import { updateGame, getGame } from "./db";
import { GameStatus } from "./types";

function getServerAccount(): Account {
  const provider = new RpcProvider({
    nodeUrl: process.env.STARKNET_RPC_URL || "https://api.cartridge.gg/x/starknet/sepolia",
  });
  return new Account({
    provider,
    address: process.env.SERVER_WALLET_ADDRESS!,
    signer: new Signer(process.env.SERVER_WALLET_PRIVATE_KEY!),
  });
}

export async function resolveGame(
  gameId: string,
  winner: string,
  endPrice?: number
): Promise<ReturnType<typeof updateGame>> {
  const game = getGame(gameId);
  if (!game) return undefined;

  let resolveTxHash: string | undefined;

  // Resolve on-chain: server wallet calls resolve_game on the escrow contract
  if (game.onChainId && process.env.SERVER_WALLET_ADDRESS && process.env.SERVER_WALLET_PRIVATE_KEY) {
    try {
      const serverAccount = getServerAccount();
      const tx = await serverAccount.execute({
        contractAddress: process.env.NEXT_PUBLIC_ESCROW_CONTRACT!,
        entrypoint: "resolve_game",
        calldata: CallData.compile({
          game_id: game.onChainId,
          winner,
        }),
      });
      resolveTxHash = tx.transaction_hash;
      console.log(`[resolver] On-chain resolve tx: ${resolveTxHash}`);
    } catch (err) {
      console.error("[resolver] On-chain resolve failed:", err);
    }
  }

  return updateGame(gameId, {
    status: GameStatus.Resolved,
    winner,
    resolveTxHash,
    ...(endPrice !== undefined && { endPrice }),
  });
}

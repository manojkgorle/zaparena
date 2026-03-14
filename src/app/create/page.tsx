"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/useWallet";
import { GameType, GAME_TYPE_LABELS, GAME_TYPE_ICONS } from "@/lib/types";
import { ESCROW_CONTRACT, TOKEN_ADDRESSES, TOKEN_DECIMALS } from "@/lib/constants";
import { uint256, RpcProvider } from "starknet";
import { SEPOLIA_RPC } from "@/lib/constants";

const WAGER_PRESETS = ["0.01", "0.05", "0.1", "0.5"];
const PREDICTION_DURATIONS = [
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
];

export default function CreateGamePage() {
  const router = useRouter();
  const { account, address, loading: walletLoading } = useWallet();
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [token, setToken] = useState<"STRK" | "ETH">("STRK");
  const [amount, setAmount] = useState("0.1");
  const [targetToken, setTargetToken] = useState("BTC");
  const [prediction, setPrediction] = useState<"up" | "down">("up");
  const [duration, setDuration] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!address || gameType === null) return;
    setLoading(true);
    setError("");

    try {
      let txHash: string | undefined;
      let onChainId: number | undefined;

      // On-chain: only if we have a Starknet account (Argent/Braavos)
      if (account) {
        const decimals = TOKEN_DECIMALS[token];
        const rawAmount = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));
        const tokenAddress = TOKEN_ADDRESSES[token];
        const u256Amount = uint256.bnToUint256(rawAmount);

        const tx = await account.execute([
          {
            contractAddress: tokenAddress,
            entrypoint: "approve",
            calldata: [ESCROW_CONTRACT, u256Amount.low.toString(), u256Amount.high.toString()],
          },
          {
            contractAddress: ESCROW_CONTRACT,
            entrypoint: "create_game",
            calldata: [
              gameType.toString(),
              tokenAddress,
              u256Amount.low.toString(),
              u256Amount.high.toString(),
            ],
          },
        ]);
        txHash = tx.transaction_hash;

        try {
          const provider = new RpcProvider({ nodeUrl: SEPOLIA_RPC });
          await provider.waitForTransaction(tx.transaction_hash);
          const result = await provider.callContract({
            contractAddress: ESCROW_CONTRACT,
            entrypoint: "get_game_count",
            calldata: [],
          });
          onChainId = Number(result[0]);
        } catch (e) {
          console.warn("Could not read on-chain game ID:", e);
        }
      }

      // Register game in API (works for both Privy and Starknet wallet users)
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType,
          creator: address,
          wagerToken: token,
          wagerAmount: amount,
          txHash,
          onChainId,
          ...(gameType === GameType.PricePrediction && {
            targetToken,
            prediction,
            duration,
          }),
        }),
      });

      const data = await res.json();
      router.push(`/game/${data.game.id}`);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  };

  if (walletLoading) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4 animate-pulse">⏳</p>
        <p className="text-arena-muted text-lg">Setting up your wallet...</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🔗</p>
        <p className="text-arena-muted text-lg">Connect your wallet to create a game</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold font-display mb-8">
        Create <span className="text-arena-accent">Game</span>
      </h1>

      {/* Step 1: Game Type */}
      <div className="mb-8">
        <p className="text-sm text-arena-muted mb-3">Choose game type</p>
        <div className="grid grid-cols-3 gap-3">
          {[GameType.CoinFlip, GameType.RPS, GameType.PricePrediction].map((type) => (
            <button
              key={type}
              onClick={() => setGameType(type)}
              className={`p-4 rounded-xl border text-center transition-all ${
                gameType === type
                  ? "border-arena-accent bg-arena-accent/10"
                  : "border-arena-border bg-arena-card hover:border-arena-accent/30"
              }`}
            >
              <span className="text-3xl block mb-2">{GAME_TYPE_ICONS[type]}</span>
              <span className="text-xs font-medium">{GAME_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {gameType !== null && (
        <>
          {/* Step 2: Token + Amount */}
          <div className="mb-8">
            <p className="text-sm text-arena-muted mb-3">Wager</p>
            <div className="flex gap-2 mb-3">
              {(["STRK", "ETH"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setToken(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    token === t
                      ? "bg-arena-accent text-black"
                      : "bg-arena-card border border-arena-border text-arena-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              {WAGER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                    amount === preset
                      ? "bg-arena-purple text-white"
                      : "bg-arena-card border border-arena-border text-arena-muted"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Custom amount"
              step="0.01"
              min="0.001"
              className="w-full px-4 py-3 rounded-lg bg-arena-card border border-arena-border text-arena-text font-mono focus:border-arena-accent focus:outline-none"
            />
          </div>

          {/* Step 3: Price Prediction specific */}
          {gameType === GameType.PricePrediction && (
            <div className="mb-8">
              <p className="text-sm text-arena-muted mb-3">Prediction</p>
              <div className="flex gap-2 mb-3">
                {["BTC", "ETH", "STRK"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTargetToken(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      targetToken === t
                        ? "bg-arena-accent text-black"
                        : "bg-arena-card border border-arena-border text-arena-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setPrediction("up")}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                    prediction === "up"
                      ? "bg-arena-accent text-black"
                      : "bg-arena-card border border-arena-border text-arena-muted"
                  }`}
                >
                  📈 UP
                </button>
                <button
                  onClick={() => setPrediction("down")}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                    prediction === "down"
                      ? "bg-arena-danger text-white"
                      : "bg-arena-card border border-arena-border text-arena-muted"
                  }`}
                >
                  📉 DOWN
                </button>
              </div>
              <div className="flex gap-2">
                {PREDICTION_DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      duration === d.value
                        ? "bg-arena-purple text-white"
                        : "bg-arena-card border border-arena-border text-arena-muted"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-arena-danger/10 border border-arena-danger/30 text-arena-danger text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-arena-accent text-black font-bold text-lg font-display hover:bg-arena-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Game..." : `Wager ${amount} ${token}`}
          </button>
        </>
      )}
    </div>
  );
}

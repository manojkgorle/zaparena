"use client";

import { useAccount } from "@starknet-react/core";
import { usePrivy } from "@privy-io/react-auth";

// Unified wallet hook
// - Starknet wallets (Argent/Braavos): full on-chain support
// - Privy (email/social): API-only identity for prediction pools
export function useWallet() {
  const { account, address: starknetAddress, status } = useAccount();
  const { authenticated, user } = usePrivy();

  // Prefer starknet-react wallet if connected
  if (status === "connected" && starknetAddress && account) {
    return {
      address: starknetAddress,
      account,
      connected: true,
      source: "starknet" as const,
      loading: false,
      error: null,
    };
  }

  // Privy user — generate a deterministic address from their user ID
  // This works for API-side games (prediction pools) but not on-chain txs
  if (authenticated && user) {
    // Create a valid-looking hex address from the Privy user ID
    const privyAddress = "0x" + Array.from(user.id)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 62)
      .padStart(64, "0");

    return {
      address: privyAddress,
      account: null, // No on-chain account — can't execute txs
      connected: true,
      source: "privy" as const,
      loading: false,
      error: null,
    };
  }

  return {
    address: null,
    account: null,
    connected: false,
    source: null,
    loading: status === "connecting",
    error: null,
  };
}

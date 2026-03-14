"use client";

import { useAccount } from "@starknet-react/core";
import { usePrivy } from "@privy-io/react-auth";
import { useStarkzapPrivyWallet } from "./useStarkzapWallet";

// Unified wallet hook: returns address and execute function from either
// starknet-react (Argent/Braavos) or Starkzap Privy wallet
export function useWallet() {
  const { account, address: starknetAddress, status } = useAccount();
  const { authenticated } = usePrivy();
  const privy = useStarkzapPrivyWallet();

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

  // Fall back to Starkzap Privy wallet
  if (authenticated && privy.wallet) {
    return {
      address: privy.address!,
      account: privy.wallet, // StarkZap wallet has .execute() like starknet Account
      connected: true,
      source: "privy" as const,
      loading: false,
      error: null,
    };
  }

  // Loading state
  if (authenticated && privy.loading) {
    return {
      address: null,
      account: null,
      connected: false,
      source: "privy" as const,
      loading: true,
      error: null,
    };
  }

  // Privy error
  if (authenticated && privy.error) {
    return {
      address: null,
      account: null,
      connected: false,
      source: "privy" as const,
      loading: false,
      error: privy.error,
    };
  }

  // Not connected
  return {
    address: null,
    account: null,
    connected: false,
    source: null,
    loading: status === "connecting",
    error: null,
  };
}

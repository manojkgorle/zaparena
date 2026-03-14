"use client";

// Privy users get an API-only identity for games
// On-chain transactions require a real Starknet wallet (Argent/Braavos)
// This is a no-op — Privy auth is handled directly in useWallet.ts
export function useStarkzapPrivyWallet() {
  return {
    wallet: null,
    address: null,
    loading: false,
    error: null,
    clear: () => {},
  };
}

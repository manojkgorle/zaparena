"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { StarkZap, OnboardStrategy, accountPresets } from "starkzap";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StarkzapWalletType = any;

interface WalletState {
  wallet: StarkzapWalletType | null;
  address: string | null;
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = "zaparena-privy-wallet";

function getSavedWallet(): { walletId: string; publicKey: string } | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function useStarkzapPrivyWallet() {
  const { authenticated, getAccessToken } = usePrivy();
  const [state, setState] = useState<WalletState>({
    wallet: null,
    address: null,
    loading: false,
    error: null,
  });

  const onboard = useCallback(async () => {
    if (!authenticated) return;
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      let saved = getSavedWallet();

      // Step 1: Create Privy wallet if we don't have one
      if (!saved) {
        const accessToken = await getAccessToken();
        const res = await fetch("/api/wallet/starknet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ? JSON.stringify(err.error) : "Failed to create wallet");
        }

        const data = await res.json();
        console.log("[starkzap] Privy wallet created:", data);
        saved = { walletId: data.walletId, publicKey: data.publicKey };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }

      console.log("[starkzap] Onboarding with:", { walletId: saved!.walletId, publicKey: saved!.publicKey });

      // Step 2: Use StarkZap to onboard with Privy strategy
      const sdk = new StarkZap({
        network: "sepolia",
        paymaster: { nodeUrl: "/api/paymaster" },
      });

      const { wallet } = await sdk.onboard({
        strategy: OnboardStrategy.Privy,
        privy: {
          resolve: async () => ({
            walletId: saved!.walletId,
            publicKey: saved!.publicKey,
            serverUrl: `${window.location.origin}/api/wallet/sign`,
          }),
        },
        accountPreset: accountPresets.argentXV050,
        deploy: "if_needed",
      });
      console.log("[starkzap] Wallet onboarded:", wallet.address);

      setState({
        wallet,
        address: wallet.address,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Starkzap Privy onboard failed:", err);
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Onboard failed",
      }));
    }
  }, [authenticated, getAccessToken]);

  // Auto-onboard when Privy is authenticated
  useEffect(() => {
    if (authenticated && !state.wallet && !state.loading) {
      onboard();
    }
  }, [authenticated, state.wallet, state.loading, onboard]);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ wallet: null, address: null, loading: false, error: null });
  }, []);

  return { ...state, onboard, clear };
}

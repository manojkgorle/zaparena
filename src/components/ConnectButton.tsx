"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useStarkzapPrivyWallet } from "@/lib/useStarkzapWallet";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { address: starknetAddress, status: starknetStatus } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect: disconnectStarknet } = useDisconnect();
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { address: privyStarknetAddress, loading: privyLoading, clear: clearPrivy } = useStarkzapPrivyWallet();
  const [showWallets, setShowWallets] = useState(false);

  // Connected via Starknet wallet (Argent/Braavos/Cartridge)
  if (starknetStatus === "connected" && starknetAddress) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono text-arena-accent">
          {truncateAddress(starknetAddress)}
        </span>
        <button
          onClick={() => disconnectStarknet()}
          className="px-4 py-2 text-sm rounded-lg bg-arena-card border border-arena-border hover:border-arena-accent/50 text-arena-muted hover:text-arena-text transition-all"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Connected via Privy
  if (authenticated && user) {
    const displayName = user.email?.address
      || user.google?.email
      || user.twitter?.username
      || "Connected";

    return (
      <div className="flex items-center gap-3">
        <span className="text-xs px-2 py-0.5 rounded bg-arena-accent/20 text-arena-accent">Privy</span>
        <div className="text-right">
          <span className="text-sm text-arena-text">{displayName}</span>
          {privyLoading && (
            <span className="block text-xs text-arena-muted">Setting up wallet...</span>
          )}
          {privyStarknetAddress && (
            <span className="block text-xs font-mono text-arena-muted">
              {truncateAddress(privyStarknetAddress)}
            </span>
          )}
        </div>
        <button
          onClick={() => { logout(); clearPrivy(); }}
          className="px-4 py-2 text-sm rounded-lg bg-arena-card border border-arena-border hover:border-arena-accent/50 text-arena-muted hover:text-arena-text transition-all"
        >
          Logout
        </button>
      </div>
    );
  }

  if (!ready) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowWallets(!showWallets)}
        disabled={starknetStatus === "connecting"}
        className="px-6 py-2.5 rounded-lg bg-arena-accent text-black font-semibold hover:bg-arena-accent/90 transition-all disabled:opacity-50"
      >
        {starknetStatus === "connecting" ? "Connecting..." : "Connect"}
      </button>

      {showWallets && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowWallets(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-arena-card border border-arena-border rounded-xl shadow-lg z-50 overflow-hidden">
            <button
              onClick={() => {
                login();
                setShowWallets(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-arena-text hover:bg-arena-border/50 transition-colors border-b border-arena-border"
            >
              <span className="font-medium">Email / Google / Twitter</span>
              <span className="block text-xs text-arena-muted mt-0.5">No wallet needed — powered by Privy + Starkzap</span>
            </button>

            <div className="px-4 py-2 text-xs text-arena-muted">Starknet Wallets</div>
            {connectors.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  connect({ connector: c });
                  setShowWallets(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-arena-text hover:bg-arena-border/50 transition-colors"
              >
                <span className="font-medium capitalize">{c.name || c.id}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

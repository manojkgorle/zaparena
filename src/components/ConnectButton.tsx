"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useWallet } from "@/lib/useWallet";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function CopyableAddress({ address, label }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1">
      {label && <span className="text-xs text-arena-muted">{label}</span>}
      <button
        onClick={copy}
        title={address}
        className="text-sm font-mono text-arena-accent hover:text-arena-accent/80 transition-colors cursor-pointer"
      >
        {truncateAddress(address)}
      </button>
      {copied && <span className="text-xs text-arena-accent">Copied!</span>}
    </div>
  );
}

export function ConnectButton() {
  const { address: starknetAddress, status: starknetStatus } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect: disconnectStarknet } = useDisconnect();
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { address: walletAddress, source } = useWallet();
  const [showWallets, setShowWallets] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  // Log wallet
  if (walletAddress) {
    console.log(`[ZapArena] ${source} wallet:`, walletAddress);
  }

  // Connected via Starknet wallet
  if (starknetStatus === "connected" && starknetAddress) {
    return (
      <div className="flex items-center gap-3 relative">
        <CopyableAddress address={starknetAddress} />
        <button
          onClick={() => setShowAddress(!showAddress)}
          className="text-xs px-2 py-1 rounded bg-arena-purple/20 text-arena-purple hover:bg-arena-purple/30 transition-colors"
        >
          {showAddress ? "Hide" : "Full"}
        </button>
        <button
          onClick={() => disconnectStarknet()}
          className="px-4 py-2 text-sm rounded-lg bg-arena-card border border-arena-border hover:border-arena-accent/50 text-arena-muted hover:text-arena-text transition-all"
        >
          Disconnect
        </button>
        {showAddress && (
          <div className="absolute top-full right-0 mt-2 p-3 bg-arena-card border border-arena-border rounded-xl shadow-lg z-50 max-w-sm">
            <p className="text-xs text-arena-muted mb-1">Starknet Address</p>
            <p className="text-xs font-mono text-arena-text break-all select-all">{starknetAddress}</p>
          </div>
        )}
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
      <div className="flex items-center gap-3 relative">
        <span className="text-xs px-2 py-0.5 rounded bg-arena-accent/20 text-arena-accent">Privy</span>
        <span className="text-sm text-arena-text">{displayName}</span>
        {walletAddress && (
          <button
            onClick={() => setShowAddress(!showAddress)}
            className="text-xs px-2 py-1 rounded bg-arena-purple/20 text-arena-purple hover:bg-arena-purple/30 transition-colors"
          >
            {showAddress ? "Hide" : "Address"}
          </button>
        )}
        <button
          onClick={logout}
          className="px-4 py-2 text-sm rounded-lg bg-arena-card border border-arena-border hover:border-arena-accent/50 text-arena-muted hover:text-arena-text transition-all"
        >
          Logout
        </button>
        {showAddress && walletAddress && (
          <div className="absolute top-full right-0 mt-2 p-3 bg-arena-card border border-arena-border rounded-xl shadow-lg z-50 max-w-sm">
            <p className="text-xs text-arena-muted mb-1">Player Address (API-only)</p>
            <p className="text-xs font-mono text-arena-text break-all select-all">{walletAddress}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(walletAddress);
              }}
              className="mt-2 text-xs px-3 py-1 rounded bg-arena-accent/20 text-arena-accent hover:bg-arena-accent/30 transition-colors"
            >
              Copy
            </button>
          </div>
        )}
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
              <span className="block text-xs text-arena-muted mt-0.5">No wallet needed — powered by Privy</span>
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

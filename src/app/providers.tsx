"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { sepolia } from "@starknet-react/chains";
import {
  StarknetConfig,
  jsonRpcProvider,
  argent,
  braavos,
} from "@starknet-react/core";
import { connector as cartridgeConnector } from "@/lib/cartridge";
import { SEPOLIA_RPC } from "@/lib/constants";

function rpc() {
  return { nodeUrl: SEPOLIA_RPC };
}

const connectors = [argent(), braavos(), cartridgeConnector];

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#00ff88",
        },
        loginMethods: ["email", "google", "twitter", "wallet"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <StarknetConfig
        chains={[sepolia]}
        provider={jsonRpcProvider({ rpc })}
        connectors={connectors}
        autoConnect
      >
        {children}
      </StarknetConfig>
    </PrivyProvider>
  );
}

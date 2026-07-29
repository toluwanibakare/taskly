"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";

const projectId = 
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || 
  "202cc0d29cc96ae3343a5891647bb566";

const wagmiConfig = getDefaultConfig({
  appName: "tuzo",
  projectId,
  chains: [celo, celoSepolia],
  ssr: true,
  appIcon: "/icon.png",
});

const queryClient = new QueryClient();

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <WalletProviderInner>{children}</WalletProviderInner>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

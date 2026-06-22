"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "3fcc6b226e640003185962237fe4a3ec";

const wagmiConfig = getDefaultConfig({
  appName: "taskly",
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

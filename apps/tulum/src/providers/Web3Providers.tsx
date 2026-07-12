"use client";
// ============================================================
// src/providers/Web3Providers.tsx — the three wallet stacks, correctly
// ============================================================
import { ReactNode, useEffect, useMemo, useState, createContext, useContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---- EVM: wagmi v2 — mainnet for signing UX, bsc + optimism for reads ----
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, bsc, optimism } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [mainnet, bsc, optimism],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! }),
  ],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http("https://bsc-dataseed.binance.org"),
    [optimism.id]: http("https://mainnet.optimism.io"),
  },
});

// ---- Solana: wallet-adapter ----
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@/styles/vendor/solana-wallet-ui.css"; // vendored — Google Fonts @import stripped

// ---- NEAR: wallet-selector (NEP-413 capable wallets) ----
import { setupWalletSelector, WalletSelector } from "@near-wallet-selector/core";
import { setupModal, WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import "@/styles/vendor/near-modal-ui.css"; // vendored — Google Fonts @import stripped

const NearCtx = createContext<{ selector: WalletSelector | null; modal: WalletSelectorModal | null }>({
  selector: null, modal: null,
});
export const useNear = () => useContext(NearCtx);

const queryClient = new QueryClient();

export default function Web3Providers({ children }: { children: ReactNode }) {
  const solanaWallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [],
  );
  const [near, setNear] = useState<{ selector: WalletSelector | null; modal: WalletSelectorModal | null }>({
    selector: null, modal: null,
  });

  useEffect(() => {
    setupWalletSelector({
      network: "mainnet",
      modules: [setupMyNearWallet(), setupMeteorWallet(), setupHereWallet()],
    }).then((selector) => {
      const modal = setupModal(selector, { contractId: "" }); // signMessage-only, no contract
      setNear({ selector, modal });
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ConnectionProvider endpoint={process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com"}>
          <WalletProvider wallets={solanaWallets} autoConnect>
            <WalletModalProvider>
              <NearCtx.Provider value={near}>{children}</NearCtx.Provider>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

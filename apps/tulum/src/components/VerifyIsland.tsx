"use client";
// Lazy island: the three wallet stacks + the Verify OG flow. This module (and
// everything it imports) stays out of the landing bundle.
import Web3Providers from "@/providers/Web3Providers";
import VerifyOG from "@/components/VerifyOG";

export default function VerifyIsland() {
  return (
    <Web3Providers>
      <VerifyOG />
    </Web3Providers>
  );
}

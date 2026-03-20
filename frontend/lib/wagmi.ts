/*
 * wagmi.ts
 * wagmi v2 + RainbowKit configuration for GovMesh.
 * Supports MetaMask, SubWallet, Talisman, and WalletConnect.
 */

"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polkadotHubTestnet, polkadotHub } from "./polkadot-hub-chain";

export const wagmiConfig = getDefaultConfig({
  appName: "GovMesh",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "govmesh-dev",
  chains: [polkadotHubTestnet, polkadotHub],
  ssr: true,
});

export const SUPPORTED_CHAIN_IDS = [polkadotHubTestnet.id, polkadotHub.id];

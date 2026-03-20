/*
 * polkadot-hub-chain.ts
 * Custom chain definition for Polkadot Hub EVM network.
 * Used in wagmi config to add the network to RainbowKit.
 */

import { defineChain } from "viem";

export const polkadotHubTestnet = defineChain({
  id: 420420421,
  name: "Polkadot Hub Testnet",
  nativeCurrency: {
    decimals: 10,
    name: "DOT",
    symbol: "DOT",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_POLKADOT_HUB_RPC || "https://rpc.polkadot-hub-testnet.io"],
      webSocket: ["wss://rpc.polkadot-hub-testnet.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout.polkadot-hub.io",
    },
  },
  testnet: true,
});

export const polkadotHub = defineChain({
  id: 420420420,
  name: "Polkadot Hub",
  nativeCurrency: {
    decimals: 10,
    name: "DOT",
    symbol: "DOT",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_POLKADOT_HUB_RPC || "https://rpc.polkadot-hub.io"],
      webSocket: ["wss://rpc.polkadot-hub.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout.polkadot-hub.io",
    },
  },
  testnet: false,
});

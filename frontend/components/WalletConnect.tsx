"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletConnect() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        if (!mounted) return <div className="h-9 w-32 rounded-xl bg-neutral-900 animate-pulse" />;

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-widest transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #E6007A, #9f0057)",
                color: "white",
                boxShadow: "0 0 20px rgba(230,0,122,0.25)",
              }}
            >
              Connect Wallet
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              className="px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-widest text-red-400 border border-red-900 bg-red-950/30"
            >
              Wrong Network
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={openChainModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-mono text-neutral-400 border border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {chain.name}
            </button>
            <button
              onClick={openAccountModal}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-neutral-300 border border-neutral-800 bg-neutral-950 hover:border-[#E6007A]/50 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#E6007A] to-[#6d003c] flex items-center justify-center text-[8px] text-white font-bold">
                {account.displayName.slice(0, 2).toUpperCase()}
              </span>
              {account.displayName}
              {account.displayBalance && (
                <span className="text-neutral-600">· {account.displayBalance}</span>
              )}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

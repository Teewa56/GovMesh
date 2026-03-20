import type { Metadata } from "next";
import { Providers } from "./providers";
import { WalletConnect } from "@/components/WalletConnect";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GovMesh — Cross-Chain Governance",
  description: "Vote on any Polkadot proposal, from any chain, in one click.",
  openGraph: {
    title: "GovMesh",
    description: "Unified cross-parachain governance on Polkadot Hub",
    siteName: "GovMesh",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#080808] text-white antialiased min-h-screen" style={{ fontFamily: "'Syne', sans-serif" }}>
        <Providers>
          {/* Ambient background mesh */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
              style={{ background: "radial-gradient(circle, #E6007A, transparent 70%)" }} />
            <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.03]"
              style={{ background: "radial-gradient(circle, #9f0057, transparent 70%)" }} />
            <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E6007A" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Navigation */}
          <header className="relative z-10 border-b border-neutral-900 bg-[#080808]/80 backdrop-blur-xl sticky top-0">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-7 h-7 relative">
                  <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="14" cy="14" r="3" fill="#E6007A"/>
                    <circle cx="14" cy="4" r="2" fill="#E6007A" opacity="0.7"/>
                    <circle cx="14" cy="24" r="2" fill="#E6007A" opacity="0.7"/>
                    <circle cx="4" cy="14" r="2" fill="#E6007A" opacity="0.7"/>
                    <circle cx="24" cy="14" r="2" fill="#E6007A" opacity="0.7"/>
                    <circle cx="6" cy="6" r="1.5" fill="#E6007A" opacity="0.4"/>
                    <circle cx="22" cy="22" r="1.5" fill="#E6007A" opacity="0.4"/>
                    <circle cx="22" cy="6" r="1.5" fill="#E6007A" opacity="0.4"/>
                    <circle cx="6" cy="22" r="1.5" fill="#E6007A" opacity="0.4"/>
                    <line x1="14" y1="14" x2="14" y2="4" stroke="#E6007A" strokeWidth="0.75" opacity="0.5"/>
                    <line x1="14" y1="14" x2="14" y2="24" stroke="#E6007A" strokeWidth="0.75" opacity="0.5"/>
                    <line x1="14" y1="14" x2="4" y2="14" stroke="#E6007A" strokeWidth="0.75" opacity="0.5"/>
                    <line x1="14" y1="14" x2="24" y2="14" stroke="#E6007A" strokeWidth="0.75" opacity="0.5"/>
                    <line x1="14" y1="14" x2="6" y2="6" stroke="#E6007A" strokeWidth="0.5" opacity="0.3"/>
                    <line x1="14" y1="14" x2="22" y2="22" stroke="#E6007A" strokeWidth="0.5" opacity="0.3"/>
                    <line x1="14" y1="14" x2="22" y2="6" stroke="#E6007A" strokeWidth="0.5" opacity="0.3"/>
                    <line x1="14" y1="14" x2="6" y2="22" stroke="#E6007A" strokeWidth="0.5" opacity="0.3"/>
                  </svg>
                </div>
                <span
                  className="text-base font-bold tracking-[0.15em] uppercase group-hover:text-[#E6007A] transition-colors"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  GovMesh
                </span>
              </Link>

              {/* Nav links */}
              <nav className="hidden sm:flex items-center gap-6">
                {[
                  { href: "/", label: "Proposals" },
                  { href: "/parachains", label: "Parachains" },
                  { href: "/history", label: "History" },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-xs font-mono text-neutral-500 hover:text-white transition-colors uppercase tracking-widest"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <WalletConnect />
            </div>
          </header>

          {/* Page content */}
          <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="relative z-10 border-t border-neutral-900 mt-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
              <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest">
                Built on Polkadot Hub · Powered by PVM + XCM
              </p>
              <p className="text-[10px] font-mono text-neutral-700">
                Polkadot Solidity Hackathon 2026
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
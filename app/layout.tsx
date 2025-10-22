import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import "@/app/globals.css";

import { cn } from "@/lib/utils";
import { QueryProvider } from "@providers/query";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeFi Yield Dashboard",
  description:
    "Monitor Gauntlet and Superlend vault performance on Base with live APY, TVL, and wallet projections.",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/charts", label: "Charts" },
  { href: "/snapshots", label: "Snapshots" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(geistSans.variable, geistMono.variable, "bg-background text-foreground")}>
        <QueryProvider>
          <div className="flex min-h-screen flex-col">
            <header className="border-b">
              <div className="container flex h-16 items-center justify-between gap-6">
                <Link href="/" className="text-lg font-semibold tracking-tight">
                  DeFi Yield Dashboard
                </Link>
                <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-md px-2 py-1 transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </header>
            <main className="container flex-1 py-8">{children}</main>
            <footer className="border-t py-6 text-sm text-muted-foreground">
              <div className="container flex flex-wrap items-center justify-between gap-4">
                <span>Live data powered by Vaults.fyi &amp; Base RPC.</span>
                <Link href="/snapshots" className="underline-offset-4 hover:underline">
                  View snapshot history
                </Link>
              </div>
            </footer>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { WalletProvider } from "@/components/wallet-provider"

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#2563eb', // Gradient Blue brand color matching Taskly theme
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents mobile browsers from auto-zooming inputs, maintaining native app feel
};

export const metadata: Metadata = {
  title: 'Taskly | Microwork & Tasks for Stablecoins',
  description: 'Earn stablecoins instantly by completing micro-tasks, social engagements, surveys, and app testing on Taskly—the premier MiniPay-powered microwork marketplace.',
  keywords: ['Celo', 'MiniPay', 'Stablecoins', 'Microwork', 'Earn Crypto', 'Micro-tasks', 'USDm', 'cUSD', 'Valora', 'Opera Mini'],
  authors: [{ name: 'TMB', url: 'https://www.tmb.it.com' }],
  openGraph: {
    title: 'Taskly | Microwork & Tasks for Stablecoins',
    description: 'Earn stablecoins instantly by completing micro-tasks on Celo.',
    siteName: 'Taskly',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'Taskly Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Taskly | Microwork & Tasks for Stablecoins',
    description: 'Earn stablecoins instantly by completing micro-tasks on Celo.',
    images: ['/icon.png'],
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="relative flex min-h-screen flex-col bg-[#F9FAFB]">
          <WalletProvider>
            <main className="flex-1 flex flex-col">
              {children}
            </main>
          </WalletProvider>
        </div>
      </body>
    </html>
  );
}

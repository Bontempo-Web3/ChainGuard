import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChainGuard - Smart Contract Security Platform',
  description: 'Scan, Deploy, and Monitor your smart contracts with security-first approach',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="flex h-screen bg-black">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-900">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

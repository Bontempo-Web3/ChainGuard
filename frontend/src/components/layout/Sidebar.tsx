'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Shield, Rocket, Activity, Github, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WalletConnect } from '@/components/wallet/WalletConnect'

const navigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Scan', href: '/scan', icon: Shield },
  { name: 'Deploy', href: '/deploy', icon: Rocket },
  { name: 'Monitor', href: '/monitor', icon: Activity },
]

interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  email: string
}

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/user`, {
        credentials: 'include'
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
      setIsAuthenticated(false)
      setUser(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      <div className="w-56 flex-shrink-0" />
      <div className="flex h-screen w-56 flex-col fixed left-0 top-0 bg-black border-r border-neutral-800 z-50">
        <div className="flex h-14 items-center px-4 border-b border-neutral-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">ChainGuard</span>
          </Link>
        </div>

        <div className="px-3 py-3 border-b border-neutral-800">
          <WalletConnect />
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                  isActive
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-neutral-800">
          <a
            href="https://github.com/Bontempo-Web3/ChainGuard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-3 text-sm text-neutral-400 hover:text-white transition-colors hover:bg-neutral-800/50"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>

          {user && (
            <div className="border-t border-neutral-800">
              <div className="p-3">
                <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-neutral-800/50">
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="h-8 w-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.login}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-sm text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-neutral-800/50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

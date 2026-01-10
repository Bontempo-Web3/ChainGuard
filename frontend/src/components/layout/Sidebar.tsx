'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Shield, Rocket, Activity, Github, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Scan', href: '/scan', icon: Shield },
  { name: 'Deploy', href: '/deploy', icon: Rocket },
  { name: 'Monitor', href: '/monitor', icon: Activity },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-56 flex-col fixed left-0 top-0 bg-black border-r border-neutral-800">
      <div className="flex h-14 items-center px-4 border-b border-neutral-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm">ChainGuard</span>
        </Link>
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

      <div className="border-t border-neutral-800 p-3">
        <a
          href="https://github.com/Bontempo-Web3/ChainGuard"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-neutral-800/50"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      </div>
    </div>
  )
}

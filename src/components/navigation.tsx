'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Trophy, Users, Calendar, Target, History, BarChart3, Home, Scale, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/auth/UserMenu'

const navigation = [
  { name: 'Overview', href: '/', icon: Home },
  { name: 'Worlds', href: '/worlds', icon: Trophy },
  { name: 'Power', href: '/power', icon: BarChart3 },
  { name: 'Skills', href: '/skills', icon: Target },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Teams', href: '/teams', icon: Users },
  { name: 'Weight', href: '/weight', icon: Scale },
  { name: 'History', href: '/history', icon: History },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black text-lg leading-none grayscale">
                <span aria-hidden="true">♿</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">Marco Scout</span>
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/favorites"
              className="p-2 rounded-md text-zinc-400 hover:bg-white/5 hover:text-white"
              title="Favorites"
            >
              <Heart className="w-5 h-5" />
            </Link>
            <Link
              href="/search"
              className="p-2 rounded-md text-zinc-400 hover:bg-white/5 hover:text-white"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </Link>
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-white/10">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium',
                  isActive
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

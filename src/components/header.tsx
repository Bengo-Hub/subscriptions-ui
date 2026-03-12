'use client';

import { useAuthStore } from '@/store/auth';
import { ChevronDown, LogOut, Search, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-sm w-full group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search plans, billing..."
            className="w-full rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all bg-transparent border border-muted"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        <div className="h-8 w-[1px] bg-border mx-1" />

        <div className="relative flex items-center gap-3 pl-2" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-3 rounded-lg hover:bg-accent/50 p-1.5 transition-colors"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="Open profile menu"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none">{user?.fullName || 'User'}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{user?.roles?.[0] || 'Member'}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold border border-border shadow-sm">
              {user?.fullName?.[0] || <User className="h-5 w-5" />}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 min-w-[180px] py-1 rounded-lg border border-border bg-card shadow-lg">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    void logout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

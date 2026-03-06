'use client';

import { useAuthStore } from '@/store/auth';
import { Search, User } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  const user = useAuthStore((state) => state.user);

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

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold leading-none">{user?.fullName || 'User'}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{user?.roles?.[0] || 'Member'}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold border border-border shadow-sm">
            {user?.fullName?.[0] || <User className="h-5 w-5" />}
          </div>
        </div>
      </div>
    </header>
  );
}

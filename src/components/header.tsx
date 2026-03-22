'use client';

import { useAuthStore } from '@/store/auth';
import { ChevronDown, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ThemeToggle } from './theme-toggle';

function displayName(user: { fullName?: string; name?: string; email?: string } | null): string {
    if (!user) return 'Account';
    return user.fullName ?? user.name ?? user.email?.split('@')[0] ?? 'Account';
}

interface HeaderProps {
    onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const logout = useAuthStore((state) => state.logout);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const showProfile = !!user && isAuthenticated;
    const name = displayName(user);
    const role = user?.roles?.[0];

    return (
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
                <button type="button" onClick={onMenuClick} className="md:hidden p-2 rounded-xl hover:bg-accent transition-colors" aria-label="Open menu">
                    <Menu className="h-5 w-5 text-muted-foreground" />
                </button>
                <div className="hidden lg:flex relative w-72 max-w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    <input
                        placeholder="Search plans, billing..."
                        className="w-full h-9 bg-accent/50 dark:bg-accent/30 border border-border/50 rounded-xl py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <ThemeToggle />

                {showProfile && (
                    <div className="relative ml-1" ref={profileRef}>
                        <button
                            type="button"
                            onClick={() => setProfileOpen((v) => !v)}
                            className="flex items-center gap-2.5 rounded-xl hover:bg-accent p-1.5 transition-all group"
                            aria-expanded={profileOpen}
                            aria-haspopup="true"
                            aria-label="Open profile menu"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-orange to-brand-gold flex items-center justify-center text-white font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
                                {name[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">{name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{role || 'User'}</p>
                            </div>
                            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {profileOpen && (
                            <>
                                <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setProfileOpen(false)} />
                                <div className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-2xl p-2 shadow-xl border border-border bg-card overflow-hidden">
                                    <div className="mb-1 px-3 py-2">
                                        <p className="text-sm font-semibold text-foreground">{name}</p>
                                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider mt-0.5">{role || 'User'}</p>
                                    </div>

                                    <div className="h-px bg-border my-1 mx-1" />

                                    <div className="grid gap-0.5">
                                        <Link
                                            href="/settings"
                                            onClick={() => setProfileOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-all group"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                                <Settings className="h-3.5 w-3.5" />
                                            </div>
                                            Settings
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProfileOpen(false);
                                                void logout();
                                            }}
                                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all group"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center transition-colors">
                                                <LogOut className="h-3.5 w-3.5" />
                                            </div>
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}

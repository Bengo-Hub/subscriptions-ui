'use client';

import { useAuthStore } from '@/store/auth';
import { ChevronDown, Menu, Search, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import { TenantFilter } from './tenant-filter';
import { useVisibleServices, AppSwitcherGrid, AppSwitcherTrigger, type ServiceKey } from '@bengo-hub/shared-ui-lib/app-switcher';
import { AccountPanel } from '@bengo-hub/shared-ui-lib/account-panel';

// subscriptions-ui never wired the shared app-switcher before — this is its first adoption.
// No [orgSlug] route segment exists here, so orgSlug comes from the authenticated user's own
// tenant slug instead of a route param.
const SERVICE_URLS: Partial<Record<ServiceKey, string>> = {
  pos: process.env.NEXT_PUBLIC_POS_UI_URL ?? 'https://pos.codevertexafrica.com',
  inventory: process.env.NEXT_PUBLIC_INVENTORY_UI_URL ?? 'https://inventory.codevertexafrica.com',
  treasury: process.env.NEXT_PUBLIC_TREASURY_UI_URL ?? 'https://books.codevertexafrica.com',
  marketflow: process.env.NEXT_PUBLIC_MARKETFLOW_UI_URL ?? 'https://marketflow.codevertexafrica.com',
  erp: process.env.NEXT_PUBLIC_ERP_UI_URL ?? 'https://erp.codevertexafrica.com',
  ordering: process.env.NEXT_PUBLIC_ORDERING_UI_URL ?? 'https://ordering.codevertexafrica.com',
  auth: process.env.NEXT_PUBLIC_AUTH_UI_URL ?? 'https://accounts.codevertexafrica.com',
  projects: process.env.NEXT_PUBLIC_PROJECTS_UI_URL ?? 'https://projects.codevertexafrica.com',
  afya: process.env.NEXT_PUBLIC_HOSPITAL_UI_URL ?? 'https://afya.codevertexafrica.com',
};

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
    const showProfile = !!user && isAuthenticated;
    const name = displayName(user);
    const role = user?.roles?.[0];
    const orgSlug = (user as any)?.tenant_slug || 'codevertex';
    // The App Store shows every real service to every authenticated user in the tenant — each
    // destination service already enforces its own RBAC + subscription gating on arrival.
    const services = useVisibleServices({ orgSlug, urls: SERVICE_URLS, canManageLinks: true });

    return (
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
                <button type="button" onClick={onMenuClick} className="md:hidden p-2 rounded-xl hover:bg-accent transition-colors" aria-label="Open menu">
                    <Menu className="h-5 w-5 text-muted-foreground" />
                </button>
                <div className="hidden lg:flex relative w-64 max-w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    <input
                        placeholder="Search plans, billing..."
                        className="w-full h-9 bg-accent/50 dark:bg-accent/30 border border-border/50 rounded-xl py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none placeholder:text-muted-foreground/50"
                    />
                </div>
                <TenantFilter className="hidden md:block" />
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <ThemeToggle />

                {showProfile && <AppSwitcherTrigger services={services} />}

                {showProfile && (
                    <div className="relative ml-1">
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

                        <AccountPanel
                            open={profileOpen}
                            onClose={() => setProfileOpen(false)}
                            user={{ name, email: user?.email ?? '' }}
                            onSignOut={() => { setProfileOpen(false); void logout(); }}
                        >
                            <div className="flex flex-col gap-3">
                                <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {role || 'User'}
                                </p>
                                <Link
                                    href="/settings"
                                    onClick={() => setProfileOpen(false)}
                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                                >
                                    <Settings className="h-4 w-4" /> Settings
                                </Link>
                                <AppSwitcherGrid services={services} onNavigate={() => setProfileOpen(false)} />
                            </div>
                        </AccountPanel>
                    </div>
                )}
            </div>
        </header>
    );
}

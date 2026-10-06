'use client';

import { cn } from '@/lib/utils';
import { LogOut, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { useTenantBranding } from '@/providers/tenant-branding-provider';
import { useAuthStore } from '@/store/auth';
import { TenantFilter } from '@/components/tenant-filter';
import { useNavRoutes, type NavRoute } from '@/components/nav-routes';

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
    const { dashboard, tenantRoutes, platformRoutes, showTenantRoutes, isPlatformOwner } = useNavRoutes();
    const { tenant } = useTenantBranding();
    const logout = useAuthStore((s) => s.logout);

    // Escape closes the phone drawer, like a native sheet.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const renderNavItem = (route: NavRoute) => {
        const Icon = route.icon;
        const inner = (
            <>
                <Icon className={cn(
                    "h-4.5 w-4.5 shrink-0 transition-colors",
                    route.active ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
                )} />
                <span className="flex-1 truncate">{route.label}</span>
                {route.comingSoon && (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Soon
                    </span>
                )}
            </>
        );
        const base = "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
        // Unfinished areas: platform owners can still open them for testing, tenants cannot.
        if (route.comingSoon && !isPlatformOwner) {
            return (
                <span key={route.href} aria-disabled="true" title="Coming soon" className={cn(base, "cursor-not-allowed text-muted-foreground/70")}>
                    {inner}
                </span>
            );
        }
        return (
            <Link
                key={route.href}
                href={route.href}
                onClick={onClose}
                aria-current={route.active ? 'page' : undefined}
                className={cn(
                    base,
                    route.active
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
            >
                {inner}
            </Link>
        );
    };

    const logoUrl = tenant?.logoUrl;
    const tenantName = tenant?.orgName || tenant?.name || 'Codevertex';

    return (
        <>
            {open && (
                <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={onClose} aria-hidden />
            )}
            <aside
                aria-label="Main navigation"
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col transition-transform duration-300 ease-out md:sticky md:top-0 md:h-dvh md:w-65 md:z-auto md:translate-x-0 md:min-w-65",
                    open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full bg-card border-r border-border w-full overflow-hidden transition-colors pt-[env(safe-area-inset-top)]">
                    {/* Logo */}
                    <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-2">
                        <Link href="/" className="flex items-center gap-3 group text-foreground" onClick={onClose}>
                            {logoUrl ? (
                                <Image
                                    src={logoUrl}
                                    alt={`${tenantName} logo`}
                                    width={160}
                                    height={40}
                                    className="h-9 w-auto object-contain max-w-40 transition-transform duration-300 group-hover:scale-105"
                                    unoptimized
                                />
                            ) : (
                                <svg role="img" aria-label="Codevertex" width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-auto transition-transform duration-300 group-hover:scale-105">
                                    <circle cx="90" cy="30" r="18" stroke="#722F5F" strokeWidth="3"/>
                                    <path d="M82 30L87 35L98 24" stroke="#722F5F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                    <text x="10" y="38" fill="currentColor" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '24px' }}>Code</text>
                                    <text x="115" y="38" fill="currentColor" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '24px' }}>ertex</text>
                                    <text x="70" y="52" fill="currentColor" opacity="0.5" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '8px', letterSpacing: '2px' }}>IT SOLUTIONS</text>
                                </svg>
                            )}
                        </Link>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close menu"
                            className="md:hidden rounded-xl p-2 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* The header hides the tenant switcher on phones, so it lives in the drawer there. */}
                    <TenantFilter className="md:hidden px-3 pt-3" />

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
                            Navigation
                        </p>

                        {renderNavItem(dashboard)}

                        {showTenantRoutes ? (
                            tenantRoutes.map(renderNavItem)
                        ) : (
                            <div className="px-3 py-2">
                                <p className="text-[11px] text-muted-foreground/70 italic leading-relaxed">
                                    Select a tenant above to view Plans, Usage, Billing & Settings.
                                </p>
                            </div>
                        )}

                        {isPlatformOwner && (
                            <div className="mt-6 pt-6 border-t border-border">
                                <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
                                    Platform Admin
                                </p>
                                {platformRoutes.map(renderNavItem)}
                            </div>
                        )}
                    </nav>

                    {/* User section */}
                    <div className="p-3 border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-accent/50">
                            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0" aria-hidden>
                                {tenantName?.[0] || 'C'}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-semibold text-foreground truncate">{tenantName}</span>
                                <span className="text-[10px] text-muted-foreground">Subscriptions</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => logout()}
                                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                title="Sign out"
                                aria-label="Sign out"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

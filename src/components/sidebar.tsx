'use client';

import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';
import {
    CreditCard,
    Gauge,
    LayoutDashboard,
    LogOut,
    Package,
    Settings,
    Sparkles,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenantBranding } from '@/providers/tenant-branding-provider';
import { useAuthStore } from '@/store/auth';

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, hasRole } = useMe();
    const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
    const { tenant } = useTenantBranding();
    const logout = useAuthStore((s) => s.logout);

    const routes = [
        { label: 'Dashboard', icon: LayoutDashboard, href: '/', active: pathname === '/' },
        { label: 'Plans', icon: Sparkles, href: '/plans', active: pathname.startsWith('/plans') },
        { label: 'Usage', icon: Gauge, href: '/usage', active: pathname.startsWith('/usage') },
        { label: 'Billing', icon: CreditCard, href: '/billing', active: pathname.startsWith('/billing') },
        { label: 'Settings', icon: Settings, href: '/settings', active: pathname.startsWith('/settings') },
    ];

    const platformRoutes = [
        { label: 'Plans Management', icon: Package, href: '/platform/plans', active: pathname.startsWith('/platform/plans') },
        { label: 'All Subscriptions', icon: Users, href: '/platform/subscriptions', active: pathname.startsWith('/platform/subscriptions') },
    ];

    const renderNavItem = (route: typeof routes[0]) => {
        const Icon = route.icon;
        return (
            <Link
                key={route.href}
                href={route.href}
                onClick={onClose}
                className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    route.active
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
            >
                <Icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    route.active ? "text-primary" : "text-muted-foreground/50 group-hover:text-foreground"
                )} />
                <span>{route.label}</span>
            </Link>
        );
    };

    return (
        <>
            {open && (
                <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={onClose} aria-hidden />
            )}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-300 ease-out md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0 md:min-w-[260px]",
                    open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full bg-card border-r border-border w-full overflow-hidden transition-colors">
                    {/* Logo */}
                    <div className="px-5 pt-5 pb-2">
                        <Link href="/" className="flex items-center gap-3 group text-foreground" onClick={onClose}>
                            <svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-auto transition-transform duration-300 group-hover:scale-105">
                                <circle cx="90" cy="30" r="18" stroke="#722F5F" strokeWidth="3"/>
                                <path d="M82 30L87 35L98 24" stroke="#722F5F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                <text x="10" y="38" fill="currentColor" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '24px' }}>Code</text>
                                <text x="115" y="38" fill="currentColor" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '24px' }}>ertex</text>
                                <text x="70" y="52" fill="currentColor" opacity="0.5" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '8px', letterSpacing: '2px' }}>IT SOLUTIONS</text>
                            </svg>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
                            Navigation
                        </p>
                        {routes.map(renderNavItem)}

                        {isPlatformOwner && (
                            <div className="mt-6 pt-6 border-t border-border">
                                <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
                                    Platform Admin
                                </p>
                                {platformRoutes.map(renderNavItem)}
                            </div>
                        )}
                    </nav>

                    {/* User section */}
                    <div className="p-3 border-t border-border">
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-accent/50">
                            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {tenant?.name?.[0] || 'C'}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-semibold text-foreground truncate">{tenant?.name || 'Codevertex'}</span>
                                <span className="text-[10px] text-muted-foreground">Subscriptions</span>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-destructive"
                                title="Sign out"
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

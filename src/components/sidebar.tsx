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
    Shield,
    Sparkles,
    Users,
    X,
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
  const tenantSlug = user?.tenant_slug || '';
  const { tenant } = useTenantBranding();
  const logout = useAuthStore((s) => s.logout);

  const isAdmin = hasRole('admin') || hasRole('super_admin');

  const routes = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/',
      active: pathname === '/',
    },
    {
      label: 'Plans',
      icon: Sparkles,
      href: '/plans',
      active: pathname.startsWith('/plans'),
    },
    {
      label: 'Usage',
      icon: Gauge,
      href: '/usage',
      active: pathname.startsWith('/usage'),
    },
    {
      label: 'Billing',
      icon: CreditCard,
      href: '/billing',
      active: pathname.startsWith('/billing'),
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/settings',
      active: pathname.startsWith('/settings'),
    },
  ];

  const platformRoutes = [
    {
      label: 'Plans Management',
      icon: Package,
      href: '/platform/plans',
      active: pathname.startsWith('/platform/plans'),
    },
    {
      label: 'All Subscriptions',
      icon: Users,
      href: '/platform/subscriptions',
      active: pathname.startsWith('/platform/subscriptions'),
    },
  ];

  const content = (
    <div className="space-y-4 py-6 flex flex-col h-full bg-brand-dark text-white border-r border-white/10 min-w-[280px]">
        <div className="px-6 py-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <Link href="/" onClick={onClose} className="flex items-center justify-center mb-10 transition-all hover:scale-105 duration-500">
                <img src="/logo.svg" alt="Codevertex" className="h-12 w-auto object-contain drop-shadow-2xl" />
            </Link>

            <div className="space-y-1 mt-4">
                <div className="px-6 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                        Subscriptions Node
                    </p>
                </div>
                {routes.map((route) => {
                    const Icon = route.icon;
                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            onClick={onClose}
                            className={cn(
                                "group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                route.active 
                                    ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                    : "text-white/50 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", route.active ? "text-white" : "group-hover:text-white")} />
                            <span className="font-bold text-xs uppercase tracking-widest">{route.label}</span>
                        </Link>
                    );
                })}

                {isPlatformOwner && (
                    <div className="mt-8 pt-8 border-t border-white/10">
                        <div className="px-6 mb-4 text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">
                            Platform Admin
                        </div>
                        <div className="space-y-1">
                            {platformRoutes.map((route) => {
                                const Icon = route.icon;
                                return (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        onClick={onClose}
                                        className={cn(
                                            "group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                            route.active 
                                                ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                                : "text-white/50 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", route.active ? "text-white" : "group-hover:text-white")} />
                                        <span className="font-bold text-xs uppercase tracking-widest">{route.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="p-6 border-t border-white/10 mt-auto">
            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 text-white/70">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-black text-primary uppercase shadow-inner">
                    {tenant?.name?.[0] || 'C'}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-black text-[10px] uppercase tracking-widest truncate">{tenant?.name || 'Codevertex'}</span>
                    <span className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">Unified Billing</span>
                </div>
                <button
                    onClick={() => logout()}
                    className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/50 hover:text-rose-400"
                    title="Sign out"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col transition-transform duration-300 md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0 md:min-w-[280px]",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 md:hidden bg-brand-dark">
          <span className="text-sm font-bold text-brand-light">Menu</span>
          <button type="button" onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-md text-brand-beige hover:bg-white/5 hover:text-white" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{content}</div>
      </aside>
    </>
  );
}

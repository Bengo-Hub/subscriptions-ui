'use client';

import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';
import {
    CreditCard,
    Gauge,
    LayoutDashboard,
    Package,
    Settings,
    Shield,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasRole } = useMe();
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  const tenantSlug = user?.tenant_slug || '';

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
    <div className="space-y-4 py-4 flex flex-col h-full bg-card border-r border-border w-[240px] min-w-[240px] max-w-[240px]">
      <div className="px-3 py-2 flex-1">
        <Link href="/" onClick={onClose} className="flex items-center pl-3 mb-14">
          <div className="relative w-8 h-8 mr-3 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="text-primary-foreground h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Subscriptions</h1>
        </Link>

        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              onClick={onClose}
              className={cn(
                'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-accent/50 rounded-lg transition',
                route.active ? 'bg-accent text-foreground' : 'text-muted-foreground'
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn('h-5 w-5 mr-3', route.active ? 'text-primary' : 'text-muted-foreground')} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>

        {isPlatformOwner && (
          <>
            <div className="mt-8 mb-2 px-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Platform
            </div>
            <div className="space-y-1">
              {platformRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={onClose}
                  className={cn(
                    'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-accent/50 rounded-lg transition',
                    route.active ? 'bg-accent text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <div className="flex items-center flex-1">
                    <route.icon className={cn('h-5 w-5 mr-3', route.active ? 'text-primary' : 'text-muted-foreground')} />
                    {route.label}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border">
        <div className="p-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold">Organization</div>
        <div className="flex items-center px-3 py-2 gap-3 text-sm font-medium">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary capitalize">
            {tenantSlug?.[0] || 'T'}
          </div>
          <span className="capitalize">{tenantSlug?.replace('-', ' ') || 'Tenant'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-border bg-card transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:min-w-[240px]",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <span className="text-sm font-bold text-foreground">Menu</span>
          <button type="button" onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{content}</div>
      </aside>
    </>
  );
}

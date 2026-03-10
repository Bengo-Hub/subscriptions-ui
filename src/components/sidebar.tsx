'use client';

import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import {
  CreditCard,
  Gauge,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { hasRole } = useMe();

  const isAdmin = hasRole('admin') || hasRole('super_admin');

  const routes = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: `/${orgSlug}`,
      active: pathname === `/${orgSlug}`,
    },
    {
      label: 'Plans',
      icon: Sparkles,
      href: `/${orgSlug}/plans`,
      active: pathname.startsWith(`/${orgSlug}/plans`),
    },
    {
      label: 'Usage',
      icon: Gauge,
      href: `/${orgSlug}/usage`,
      active: pathname.startsWith(`/${orgSlug}/usage`),
    },
    {
      label: 'Billing',
      icon: CreditCard,
      href: `/${orgSlug}/billing`,
      active: pathname.startsWith(`/${orgSlug}/billing`),
    },
    {
      label: 'Settings',
      icon: Settings,
      href: `/${orgSlug}/settings`,
      active: pathname.startsWith(`/${orgSlug}/settings`),
    },
  ];

  const platformRoutes = [
    {
      label: 'Plans Management',
      icon: Package,
      href: `/${orgSlug}/platform/plans`,
      active: pathname.startsWith(`/${orgSlug}/platform/plans`),
    },
    {
      label: 'All Subscriptions',
      icon: Users,
      href: `/${orgSlug}/platform/subscriptions`,
      active: pathname.startsWith(`/${orgSlug}/platform/subscriptions`),
    },
  ];

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-card border-r border-border w-[240px] min-w-[240px] max-w-[240px] hidden md:flex">
      <div className="px-3 py-2 flex-1">
        <Link href={`/${orgSlug}`} className="flex items-center pl-3 mb-14">
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

        {orgSlug === 'codevertex' && (
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
            {orgSlug?.[0]}
          </div>
          <span className="capitalize">{orgSlug?.replace('-', ' ')}</span>
        </div>
      </div>
    </div>
  );
}

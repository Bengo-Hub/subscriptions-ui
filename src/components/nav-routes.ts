'use client';

import { useMe } from '@/hooks/useMe';
import { useTenantFilterStore } from '@/store/tenant-filter';
import {
  BadgePercent,
  Building2,
  CreditCard,
  Gauge,
  Handshake,
  Headset,
  KeyRound,
  LayoutDashboard,
  Mail,
  Settings,
  Sliders,
  Layers,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

export interface NavRoute {
  key: string;
  label: string;
  /** Shorter label for the phone bottom bar. */
  shortLabel?: string;
  icon: LucideIcon;
  href: string;
  active: boolean;
  /** Still being built: shown with a "Soon" badge and not navigable. */
  comingSoon?: boolean;
}

/** Areas that exist in the menu but are not finished yet. Their pages show ComingSoon. */
export const COMING_SOON_ROUTES = new Set(['/email-hosting', '/partner']);

/**
 * The one list of app routes, shared by the sidebar and the phone bottom bar so the two can
 * never disagree about what a user may open.
 */
export function useNavRoutes() {
  const pathname = usePathname();
  const { user } = useMe();
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);
  const isPlatformOwner = !!(user?.is_platform_owner || user?.tenant_slug === 'codevertex');
  // Tenant pages only make sense for a tenant user, or a platform owner who picked a tenant.
  const showTenantRoutes = !isPlatformOwner || !!selectedTenant;

  const route = (key: string, label: string, icon: LucideIcon, href: string, shortLabel?: string): NavRoute => ({
    key,
    label,
    shortLabel,
    icon,
    href,
    active: href === '/' ? pathname === '/' : pathname.startsWith(href),
    comingSoon: COMING_SOON_ROUTES.has(href),
  });

  const dashboard = route('dashboard', 'Dashboard', LayoutDashboard, '/', 'Home');
  const tenantRoutes = [
    route('plans', 'Plans', Layers, '/plans'),
    route('usage', 'Usage', Gauge, '/usage'),
    route('billing', 'Billing', CreditCard, '/billing'),
    route('email', 'Email Hosting', Mail, '/email-hosting', 'Email'),
    route('partner', 'Partner Portal', Handshake, '/partner', 'Partner'),
    route('settings', 'Settings', Settings, '/settings'),
  ];
  const platformRoutes = [
    route('service-charges', 'Service Charges', BadgePercent, '/platform/service-charges'),
    route('licenses', 'Licenses', KeyRound, '/platform/licenses'),
    route('tenants', 'Tenants', Building2, '/platform/tenants'),
    route('subscriptions', 'Subscriptions', Users, '/platform/subscriptions'),
    route('support', 'Support Billing', Headset, '/platform/support'),
    route('coupons', 'Coupons', Tag, '/platform/coupons'),
    route('configs', 'Configs', Sliders, '/platform/configs'),
  ];

  // Phone bottom bar: the four most used destinations; everything else sits behind "More".
  const bottomTabs = showTenantRoutes
    ? [dashboard, ...tenantRoutes.filter((r) => ['plans', 'usage', 'billing'].includes(r.key))]
    : [dashboard, ...platformRoutes.filter((r) => ['tenants', 'subscriptions', 'support'].includes(r.key))];

  return { dashboard, tenantRoutes, platformRoutes, bottomTabs, showTenantRoutes, isPlatformOwner };
}

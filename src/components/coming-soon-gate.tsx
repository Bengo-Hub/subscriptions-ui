'use client';

import { ReactNode } from 'react';
import { Eye, type LucideIcon } from 'lucide-react';
import { useMe } from '@/hooks/useMe';
import { ComingSoon } from '@/components/coming-soon';

/**
 * Tenants see the Coming soon page for an unfinished area. Platform owners still reach the real
 * page (they are finishing and testing it) under a preview banner.
 */
export function ComingSoonGate({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const { user, isLoading } = useMe();
  if (isLoading) return null;
  const isPlatformOwner = !!(user?.is_platform_owner || user?.tenant_slug === 'codevertex');
  if (!isPlatformOwner) return <ComingSoon title={title} description={description} icon={icon} />;
  return (
    <>
      <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 sm:px-6 lg:px-8">
        <Eye className="h-3.5 w-3.5" aria-hidden />
        Preview: {title} is marked Coming soon. Tenants cannot open this page yet.
      </div>
      {children}
    </>
  );
}

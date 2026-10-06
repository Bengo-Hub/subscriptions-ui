'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { AdminPlansView } from '@/components/plans/AdminPlansView';
import { TenantPlansView } from '@/components/plans/TenantPlansView';

/** Platform owners manage plans; tenants pick, upgrade or downgrade. */
function PlansContent() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  return isPlatformOwner ? <AdminPlansView /> : <TenantPlansView />;
}

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading plans" />
        </div>
      }
    >
      <PlansContent />
    </Suspense>
  );
}

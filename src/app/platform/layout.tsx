'use client';

import { useMe } from '@/hooks/useMe';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useMe();
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';

  useEffect(() => {
    if (!isLoading && user && !isPlatformOwner) {
      router.replace('/');
    }
  }, [user, isLoading, isPlatformOwner, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isPlatformOwner) {
    return null;
  }

  return <>{children}</>;
}

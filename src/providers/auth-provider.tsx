'use client';

import { useAuthStore } from '@/store/auth';
import { useParams, usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { status, initialize } = useAuthStore();
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (status === 'idle' && !pathname?.includes('/auth')) {
      if (orgSlug) {
        useAuthStore.getState().redirectToSSO(orgSlug, window.location.href);
      }
    }
  }, [status, pathname, orgSlug]);

  if (status === 'loading' && !pathname?.includes('/auth')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Initializing session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

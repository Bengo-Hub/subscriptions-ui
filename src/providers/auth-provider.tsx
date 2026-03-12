'use client';

import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

/** Uses TanStack Query (useMe) for auth-api GET /me with TTL; roles/permissions for nav and route protection. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { status, initialize } = useAuthStore();
  const session = useAuthStore((s) => s.session);
  const { isLoading: meLoading, isError, error } = useMe();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const isAuthCallback = pathname?.includes('/auth');
  const isUnauthorizedPage = pathname?.endsWith('/unauthorized');

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (status === 'idle' && !pathname?.includes('/auth')) {
      initialize();
      if (status === 'idle') {
        useAuthStore.getState().redirectToSSO(window.location.href);
      }
    }
  }, [status, pathname]);

  useEffect(() => {
    if (!session || isUnauthorizedPage || meLoading) return;
    const statusCode =
      (error as { response?: { status?: number }; status?: number })?.response?.status ??
      (error as { status?: number })?.status;
    if (isError && statusCode === 403) {
      router.replace('/unauthorized');
    }
  }, [session, isError, error, isUnauthorizedPage, meLoading, router]);

  // Show loading until auth state is known so dashboard never flashes before SSO redirect
  const loading =
    status === 'loading' ||
    status === 'idle' ||
    (!!session && meLoading);
  if (loading && !isAuthCallback) {
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

'use client';

import { useResellerStatus } from '@/hooks/useResellerPortal';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

// Certified Reseller & Partner Program self-service portal guard — mirrors platform/layout.tsx's
// exact shape (loading -> redirect-if-not-authorized -> render), just checking reseller status
// (GET /api/v1/reseller/me, auth-api) instead of useMe()'s is_platform_owner flag. is_reseller
// isn't on the JWT/`/auth/me` profile — it's resolved via this dedicated endpoint instead (see
// .claude/plans/reseller-partner-program-plan-2026-08-23.md register item G9). Any error
// (403 not-a-reseller, or a genuine network/auth failure) means the portal can't render, so
// both cases redirect home the same way — the distinction matters for retry behavior (see the
// hook), not for what this layout does with the outcome.
export default function PartnerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isLoading, isError } = useResellerStatus();

  useEffect(() => {
    if (!isLoading && (isError || !data)) {
      router.replace('/');
    }
  }, [isLoading, isError, data, router]);

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

  if (!data) {
    return null;
  }

  return <>{children}</>;
}

'use client';

import { consumeState } from '@/lib/auth/pkce';
import { useAuthStore } from '@/store/auth';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

function CallbackHandler() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const processed = useRef(false);

  const handleSSOCallback = useAuthStore((s) => s.handleSSOCallback);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);

  // Effect 1: trigger handleSSOCallback on mount
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const savedState = consumeState();

    if (!code || !state || state !== savedState) {
      router.replace(orgSlug ? `/${orgSlug}` : '/');
      return;
    }

    const callbackUrl = orgSlug
      ? `${window.location.origin}/${orgSlug}/auth/callback`
      : `${window.location.origin}/auth/callback`;

    handleSSOCallback(code, callbackUrl);
  }, [orgSlug, searchParams, handleSSOCallback, router]);

  // Effect 2: watch for status=authenticated && user → redirect
  useEffect(() => {
    if (status !== 'authenticated' || !user) return;

    const returnTo = sessionStorage.getItem('sso_return_to');
    sessionStorage.removeItem('sso_return_to');

    if (returnTo && returnTo.startsWith('/')) {
      router.replace(returnTo);
    } else {
      router.replace(orgSlug ? `/${orgSlug}` : '/');
    }
  }, [status, user, router, orgSlug]);

  // Error state
  if (status === 'error' && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="text-destructive text-lg font-semibold">Sign-in failed</div>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
          <button
            onClick={() => {
              processed.current = false;
              router.replace(orgSlug ? `/${orgSlug}` : '/');
            }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">
          {status === 'syncing' ? 'Syncing your account...' : 'Completing sign-in...'}
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}

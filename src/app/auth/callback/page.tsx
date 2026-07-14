'use client';

import { consumeState } from '@/lib/auth/pkce';
import { useAuthStore } from '@/store/auth';
import { SSOCallbackError } from '@bengo-hub/shared-ui-lib/auth';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

// The stored return URL was captured BEFORE the SSO hop. If the user switched
// organisation mid-login (accounts org picker), its slug is stale — re-point
// the first path segment at the org the token was issued for.
function sanitizedReturnTo(raw: string | null, orgSlug: string | undefined): string | null {
  if (!raw || !raw.startsWith('/')) return null;
  if (!orgSlug) return raw;
  const url = new URL(raw, window.location.origin);
  const segments = url.pathname.split('/');
  if (segments[1] && segments[1] !== orgSlug && segments[1] !== 'auth') {
    segments[1] = orgSlug;
  }
  return segments.join('/') + url.search + url.hash;
}

function CallbackHandler() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const processed = useRef(false);
  const [localError, setLocalError] = useState<{ code: string; description?: string | null } | null>(null);

  const handleSSOCallback = useAuthStore((s) => s.handleSSOCallback);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);

  // Effect 1: trigger handleSSOCallback on mount
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    // SSO error redirects (?error=...) carry no code. Surface them instead of
    // silently bouncing to the app root — that bounce re-initiated SSO and
    // produced an endless redirect loop.
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setLocalError({ code: oauthError, description: searchParams.get('error_description') });
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const savedState = consumeState();

    if (!code || !state || state !== savedState) {
      setLocalError({
        code: 'invalid_callback',
        description: 'The sign-in link is incomplete or expired. Please sign in again.',
      });
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

    const safeReturnTo = sanitizedReturnTo(returnTo, orgSlug);
    if (safeReturnTo) {
      router.replace(safeReturnTo);
    } else {
      router.replace(orgSlug ? `/${orgSlug}` : '/');
    }
  }, [status, user, router, orgSlug]);

  // Error state — SSO redirect errors, malformed callbacks, or exchange failures
  if (localError || (status === 'error' && error)) {
    return (
      <SSOCallbackError
        error={localError?.code || 'auth_error'}
        errorDescription={localError?.description || error}
        orgSlug={orgSlug}
        onRetry={() => {
          const dest = orgSlug ? `/${orgSlug}` : '/';
          useAuthStore.getState().redirectToSSO(dest, orgSlug || undefined);
        }}
      />
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

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

  const { handleSSOCallback, status } = useAuthStore();

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const savedState = consumeState();

    if (!code || !state || state !== savedState) {
      router.replace(`/${orgSlug}`);
      return;
    }

    const callbackUrl = `${window.location.origin}/${orgSlug}/auth/callback`;

    handleSSOCallback(code, callbackUrl).then(() => {
      const { status } = useAuthStore.getState();

      // Subscription required — redirect to subscribe page within this app
      if (status === 'subscription_required') {
        router.replace(orgSlug ? `/${orgSlug}/subscribe` : '/subscribe');
        return;
      }

      const returnTo = sessionStorage.getItem('sso_return_to');
      sessionStorage.removeItem('sso_return_to');

      if (returnTo && returnTo.startsWith(window.location.origin)) {
        router.replace(returnTo.replace(window.location.origin, ''));
      } else {
        router.replace(orgSlug ? `/${orgSlug}` : '/');
      }
    });
  }, [orgSlug, searchParams, handleSSOCallback, router]);

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

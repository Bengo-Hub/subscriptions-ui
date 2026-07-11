import { apiClient } from '@/lib/api/client';
import { buildAuthorizeUrl, buildLogoutUrl, exchangeCodeForTokens, fetchProfile, revokeServerSession } from '@/lib/auth/api';
import {
    consumeVerifier,
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
    storeState,
    storeVerifier,
} from '@/lib/auth/pkce';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  tenant_id?: string;
  tenant_slug?: string;
  is_platform_owner?: boolean;
  isSuperUser?: boolean;
  email_verification?: import('@bengo-hub/shared-ui-lib/auth').EmailVerificationState;
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error' | 'syncing' | 'subscription_required';
  user: UserProfile | null;
  session: Session | null;
  error: string | null;
  isAuthenticated?: boolean;
  lastAuthenticatedAt: number | null;

  /** Subscription info fetched lazily after login (undefined = not started, null = loading). */
  subscriptionInfo: Record<string, unknown> | null | undefined;
  setSubscriptionInfo: (info: Record<string, unknown> | null) => void;

  initialize: () => Promise<void>;
  /** When in tenant context (e.g. route or selection), pass tenant so token is minted for that org. */
  redirectToSSO: (returnTo?: string, tenant?: string) => Promise<void>;
  handleSSOCallback: (code: string, callbackUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  syncTenantToStorage: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set: any, get: any) => ({
      status: 'idle',
      subscriptionInfo: undefined,
      setSubscriptionInfo: (info: Record<string, unknown> | null) => set({ subscriptionInfo: info }),
      user: null,
      session: null,
      error: null,
      isAuthenticated: false,
      lastAuthenticatedAt: null,
      
      syncTenantToStorage: (user: UserProfile | null) => {
        if (user) {
          localStorage.setItem('tenant_id', user.tenant_id || '');
          localStorage.setItem('tenant_slug', user.tenant_slug || '');
          localStorage.setItem('is_platform_owner', (user.is_platform_owner || user.tenant_slug === 'codevertex').toString());
        } else {
          localStorage.removeItem('tenant_id');
          localStorage.removeItem('tenant_slug');
          localStorage.removeItem('is_platform_owner');
        }
      },

      initialize: async () => {
        const { session } = get();
        if (!session) {
          set({ status: 'unauthenticated' });
          return;
        }

        apiClient.setAccessToken(session.accessToken);
        set({ status: 'loading' });

        try {
          const user = await fetchProfile(session.accessToken);
          get().syncTenantToStorage(user);
          set({ user, status: 'authenticated', isAuthenticated: true, lastAuthenticatedAt: Date.now() });
        } catch {
          get().syncTenantToStorage(null);
          set({ status: 'unauthenticated', session: null, user: null, isAuthenticated: false });
        }
      },

      redirectToSSO: async (returnTo?: string, tenant?: string) => {
        set({ status: 'loading', error: null });
        try {
          const verifier = generateCodeVerifier();
          const challenge = await generateCodeChallenge(verifier);
          const state = generateState();

          storeVerifier(verifier);
          storeState(state);

          if (returnTo && typeof window !== 'undefined') {
            sessionStorage.setItem('sso_return_to', returnTo);
          }

          const callbackUrl = tenant
            ? `${window.location.origin}/${tenant}/auth/callback`
            : `${window.location.origin}/auth/callback`;
          const authorizeUrl = buildAuthorizeUrl({
            codeChallenge: challenge,
            state,
            redirectUri: callbackUrl,
            tenant,
          });

          window.location.href = authorizeUrl;
        } catch {
          set({ status: 'error', error: 'Failed to start sign-in' });
        }
      },

      handleSSOCallback: async (code: string, callbackUrl: string) => {
        set({ status: 'syncing', error: null });
        const verifier = consumeVerifier();

        if (!verifier) {
          set({ status: 'error', error: 'Session expired' });
          return;
        }

        try {
          const tokens = await exchangeCodeForTokens({
            code,
            codeVerifier: verifier,
            redirectUri: callbackUrl,
          });

          const session: Session = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || '',
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          };

          apiClient.setAccessToken(session.accessToken);
          set({ session });

          let lastErr: unknown;
          for (let attempts = 0; attempts < 5; attempts++) {
            try {
              const user = await fetchProfile(session.accessToken);
              get().syncTenantToStorage(user);
              set({ user, status: 'authenticated', isAuthenticated: true, lastAuthenticatedAt: Date.now() });
              return;
            } catch (err) {
              lastErr = err;
              await new Promise((r) => setTimeout(r, 1500));
            }
          }

          // All retries failed — set error (never "authenticated" without user)
          const msg = lastErr instanceof Error ? lastErr.message : 'Failed to load profile';
          set({ status: 'error', error: msg });
        } catch {
          set({ status: 'error', error: 'Sign-in failed' });
        }
      },

      logout: async () => {
        // Revoke the backend session (Redis session_token keys + DB sessions)
        // while the access token is still available.
        const token = get().session?.accessToken;
        await revokeServerSession(token);

        get().syncTenantToStorage(null);
        set({ status: 'unauthenticated', user: null, session: null, isAuthenticated: false, subscriptionInfo: undefined, lastAuthenticatedAt: null });
        apiClient.setAccessToken(null);
        if (typeof window !== 'undefined') {
          try { localStorage.removeItem('subscriptions-auth-storage'); } catch { /* no-op */ }
          try { localStorage.removeItem('tenant_id'); } catch { /* no-op */ }
          try { localStorage.removeItem('tenant_slug'); } catch { /* no-op */ }
          try { localStorage.removeItem('is_platform_owner'); } catch { /* no-op */ }
          try { sessionStorage.clear(); } catch { /* no-op */ }
          const returnTo = encodeURIComponent(window.location.origin);
          window.location.href = buildLogoutUrl(`https://accounts.codevertexitsolutions.com/login?return_to=${returnTo}`);
        }
      },

      fetchUser: async () => {
        const { session } = get();
        if (!session) return;
        try {
          const user = await fetchProfile(session.accessToken);
          set({ user, isAuthenticated: true });
        } catch {
          console.error('Fetch user failed');
        }
      },

      setUser: (user: UserProfile | null) => {
        set({ user, isAuthenticated: !!user });
        get().syncTenantToStorage(user);
      },
    }),
    {
      name: 'subscriptions-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state: AuthState) => ({
        session: state.session,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state: AuthState | undefined) => {
        if (state?.session?.accessToken) {
          apiClient.setAccessToken(state.session.accessToken);
        }
        if (state?.user) {
          state.syncTenantToStorage(state.user);
        }
      },
    }
  )
);

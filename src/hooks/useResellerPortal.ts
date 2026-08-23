'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import {
  getOwnResellerStatus,
  getOwnResellerClients,
  getOwnResellerCommission,
  ResellerApiError,
} from '@/lib/api/reseller';

const STALE_MS = 5 * 60 * 1000;

// isNotAReseller lets callers (the /partner layout guard) distinguish "this tenant isn't a
// certified reseller" (403 not_a_reseller) from a real network/auth failure, since only the
// former should redirect the user away rather than show an error state.
export function isNotAReseller(error: unknown): boolean {
  return error instanceof ResellerApiError && error.status === 403;
}

export function useResellerStatus() {
  const accessToken = useAuthStore((s) => s.session?.accessToken) ?? null;
  return useQuery({
    queryKey: ['reseller', 'me', accessToken],
    queryFn: () => getOwnResellerStatus(accessToken as string),
    enabled: !!accessToken,
    staleTime: STALE_MS,
    retry: (failureCount, error) => !isNotAReseller(error) && failureCount < 2,
  });
}

export function useResellerClients() {
  const accessToken = useAuthStore((s) => s.session?.accessToken) ?? null;
  return useQuery({
    queryKey: ['reseller', 'clients', accessToken],
    queryFn: () => getOwnResellerClients(accessToken as string),
    enabled: !!accessToken,
    staleTime: STALE_MS,
    retry: (failureCount, error) => !isNotAReseller(error) && failureCount < 2,
  });
}

export function useResellerCommission() {
  const accessToken = useAuthStore((s) => s.session?.accessToken) ?? null;
  return useQuery({
    queryKey: ['reseller', 'commission', accessToken],
    queryFn: () => getOwnResellerCommission(accessToken as string),
    enabled: !!accessToken,
    staleTime: STALE_MS,
    retry: (failureCount, error) => !isNotAReseller(error) && failureCount < 2,
  });
}

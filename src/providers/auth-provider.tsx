'use client';

import { apiClient } from '@/lib/api/client';
import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
    const { status, initialize } = useAuthStore();
    const logout = useAuthStore((s) => s.logout);
    const { isLoading: meLoading, isError: meError } = useMe();
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();

    useEffect(() => {
        const checkAuth = async () => {
            if (status === 'idle') {
                await initialize();
            }
            if (useAuthStore.getState().status === 'unauthenticated' && !pathname?.includes('/auth')) {
                useAuthStore.getState().redirectToSSO(window.location.href);
            }
        };
        checkAuth();
    }, [status, pathname, initialize]);

    // Register 401 handler: clear all caches and redirect to SSO
    useEffect(() => {
        apiClient.setOn401(() => {
            queryClient.clear();
            void logout();
        });
        return () => apiClient.setOn401(null);
    }, [queryClient, logout]);

    useEffect(() => {
        if (meError && !pathname?.includes('/auth')) {
            // Skip SSO redirect for subscription 403 — user is authenticated
            const data = (meError as any)?.response?.data;
            if (data?.code === 'subscription_inactive' || data?.upgrade === true) return;
            useAuthStore.getState().redirectToSSO(window.location.href);
        }
    }, [meError, pathname]);

    const loading =
        status === 'loading' ||
        status === 'idle' ||
        (status === 'authenticated' && meLoading);
    if (loading && !pathname?.includes('/auth')) {
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

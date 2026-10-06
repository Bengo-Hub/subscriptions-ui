'use client';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { useNavRoutes } from '@/components/nav-routes';
import { AuthProvider } from '@/providers/auth-provider';
import { TenantBrandingProvider } from '@/providers/tenant-branding-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileBottomNav } from '@bengo-hub/shared-ui-lib/navigation';
import { CookieNotice } from '@bengo-hub/shared-ui-lib/legal';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { ReactNode, useState } from 'react';

// The theme comes from the single ThemeProvider in app/layout.tsx. A second, nested provider
// here used to fight it with a different default.
export function AppShell({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000,
                        gcTime: 10 * 60 * 1000,
                        retry: 2,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <TenantBrandingProvider>
                    <ShellLayout>{children}</ShellLayout>
                </TenantBrandingProvider>
            </AuthProvider>
            <Toaster richColors position="top-right" closeButton />
        </QueryClientProvider>
    );
}

function ShellLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { bottomTabs } = useNavRoutes();

    return (
        <div className="flex h-dvh overflow-hidden bg-background">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
                {/* pb clears the phone bottom bar so the last card is never hidden under it. */}
                <main id="main-content" className="flex-1 overflow-y-auto overscroll-contain bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                    <div className="min-h-full flex flex-col">
                        <div className="flex-1">{children}</div>
                        <Footer />
                    </div>
                </main>
            </div>
            <MobileBottomNav
                className="md:hidden"
                LinkComponent={Link}
                tabs={bottomTabs.map((t) => ({
                    key: t.key,
                    label: t.shortLabel ?? t.label,
                    href: t.href,
                    icon: t.icon,
                    active: t.active,
                }))}
                onOpenMore={() => setSidebarOpen(true)}
            />
            <CookieNotice offsetClassName="bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0" />
        </div>
    );
}

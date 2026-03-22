'use client';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/providers/auth-provider';
import { TenantBrandingProvider } from '@/providers/tenant-branding-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { ReactNode, useState } from 'react';

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
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
            >
                <AuthProvider>
                    <TenantBrandingProvider>
                        <div className="flex h-screen overflow-hidden bg-background">
                            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                                <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
                                <main className="flex-1 overflow-y-auto bg-background">
                                    <div className="min-h-full flex flex-col">
                                        <div className="flex-1">{children}</div>
                                        <Footer />
                                    </div>
                                </main>
                            </div>
                        </div>
                    </TenantBrandingProvider>
                </AuthProvider>
                <Toaster richColors position="top-right" />
            </ThemeProvider>
        </QueryClientProvider>
    );
}

'use client';

import '@/app/globals.css';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/providers/auth-provider';
import { TenantBrandingProvider } from '@/providers/tenant-branding-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { ReactNode, useState } from 'react';

export default function OrgLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,     // 5 min — most data is reference/moderate
            gcTime: 10 * 60 * 1000,        // 10 min garbage collection
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
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <TenantBrandingProvider>
            <div className="flex h-screen overflow-hidden bg-background">
              <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden text-slate-900 dark:text-slate-100">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
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

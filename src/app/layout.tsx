import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import { DM_Sans, Outfit, JetBrains_Mono } from 'next/font/google';
import { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { ThemeProvider } from '@/components/theme-provider';

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
    display: 'swap',
    weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
    display: 'swap',
    weight: ['400', '500', '600', '700', '800', '900'],
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains',
    display: 'swap',
    weight: ['400', '500'],
});

export const metadata: Metadata = {
    title: {
        default: 'Codevertex Subscriptions',
        template: '%s | Codevertex Subscriptions',
    },
    description: 'Subscription and billing management platform',
    icons: {
        icon: '/favicon.svg',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Subscriptions',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: dark)', color: '#1c0f02' },
        { media: '(prefers-color-scheme: light)', color: '#ea8022' },
    ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${dmSans.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
        >
            <body className="font-sans antialiased min-h-dvh overflow-x-hidden">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem={false}
                    disableTransitionOnChange
                >
                    <AppShell>{children}</AppShell>
                </ThemeProvider>
            </body>
        </html>
    );
}

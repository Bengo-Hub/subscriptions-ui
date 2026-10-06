'use client';

import { ExternalLink } from 'lucide-react';
import { LegalLinks } from '@bengo-hub/shared-ui-lib/legal';

export function Footer() {
    return (
        <footer className="border-t border-border bg-card/50 backdrop-blur-sm py-5 mt-auto">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <LegalLinks />
                <div className="flex flex-col gap-1 text-xs text-muted-foreground lg:items-end">
                    <span>&copy; {new Date().getFullYear()} Codevertex Africa Limited. All rights reserved.</span>
                    <a
                        href="https://codevertexafrica.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 group transition-all rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="opacity-80 group-hover:opacity-100 transition-opacity">Powered by</span>
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">Codevertex Africa Limited</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden />
                    </a>
                </div>
            </div>
        </footer>
    );
}

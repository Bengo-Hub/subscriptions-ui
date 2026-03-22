'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

export function Footer() {
    return (
        <footer className="border-t border-border bg-card/50 backdrop-blur-sm py-5 mt-auto">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>All Rights Reserved. Codevertex IT Solutions &copy; {new Date().getFullYear()}.</span>
                <a
                    href="https://codevertexitsolutions.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 group transition-all"
                >
                    <span className="opacity-70 group-hover:opacity-100 transition-opacity">Powered by</span>
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">Codevertex IT Solutions</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
            </div>
        </footer>
    );
}

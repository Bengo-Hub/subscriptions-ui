'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-brand-dark py-4 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-brand-beige/50">
        <span>All Rights Reserved. Codevertex IT Solutions &copy; {new Date().getFullYear()}.</span>
        <a
          href="https://codevertexitsolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-brand-orange transition-colors"
        >
          Powered by <span className="font-bold text-brand-orange">Codevertex IT Solutions</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </footer>
  );
}

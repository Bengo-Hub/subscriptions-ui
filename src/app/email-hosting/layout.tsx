'use client';

import { ReactNode } from 'react';
import { Mail } from 'lucide-react';
import { ComingSoonGate } from '@/components/coming-soon-gate';

// Email Hosting is not finished yet, so tenants see Coming soon (see COMING_SOON_ROUTES).
export default function EmailHostingLayout({ children }: { children: ReactNode }) {
  return (
    <ComingSoonGate
      title="Email Hosting"
      icon={Mail}
      description="Business email on your own domain, with mailboxes, storage and licences managed here. We are finishing it and will let you know when it opens."
    >
      {children}
    </ComingSoonGate>
  );
}

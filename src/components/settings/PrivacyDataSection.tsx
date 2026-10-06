'use client';

import { Cookie, Download, ExternalLink, FileText, ShieldCheck, UserX } from 'lucide-react';
import { legalUrls, openCookieSettings, PLATFORM_LEGAL_ENTITY } from '@bengo-hub/shared-ui-lib/legal';
import { SectionCard } from '@/components/ui/page-header';

/**
 * What this app keeps about the organisation, and where to exercise data rights. Export and
 * deletion of a person's account live in the accounts portal (auth owns identity and runs the
 * platform-wide deletion), so this links there instead of duplicating it.
 */
export function PrivacyDataSection() {
  const urls = legalUrls();
  const rows = [
    { icon: Download, title: 'Get a copy of your data', text: 'Download what Codevertex holds about you.', href: urls.dataRequests },
    { icon: UserX, title: 'Delete your personal account', text: 'Removes your sign-in and personal details from every Codevertex app.', href: urls.dataRequests },
    { icon: FileText, title: 'Privacy policy', text: 'What we collect, why, who processes it and for how long.', href: urls.privacy },
  ];

  return (
    <SectionCard title="Privacy and data" icon={ShieldCheck} description="Your rights under the Kenya Data Protection Act and GDPR.">
      <div className="space-y-4">
        <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">What this app keeps</p>
          <p className="mt-1">
            Your plan, invoices and payments, the billing email above, and for saved cards only the brand, last four digits and
            expiry. Full card numbers are handled by the payment provider and never reach us.
          </p>
        </div>

        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((r) => (
            <li key={r.title}>
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <r.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{r.title}</span>
                  <span className="block text-xs text-muted-foreground">{r.text}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </a>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={openCookieSettings}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Cookie className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Cookie settings</span>
                <span className="block text-xs text-muted-foreground">Change which optional cookies are allowed.</span>
              </span>
            </button>
          </li>
        </ul>

        <p className="text-xs text-muted-foreground">
          Questions about your data: <a className="underline" href={`mailto:${PLATFORM_LEGAL_ENTITY.email}`}>{PLATFORM_LEGAL_ENTITY.email}</a>.
        </p>
      </div>
    </SectionCard>
  );
}

import { notFound, redirect } from 'next/navigation';

// Other apps' switchers and upgrade links reach this app as pricing.<domain>/<tenant-slug>. It has no
// per-tenant routes (the tenant comes from the session), so a tenant lands on its billing page.
// Static routes (/billing, /plans, ...) still win over this segment.
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;

export default async function OrgSlugRedirect({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  if (!SLUG_RE.test(orgSlug)) notFound();
  redirect('/billing');
}

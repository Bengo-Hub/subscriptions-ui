'use client';

import { Badge, Button, Card, CardContent, CardHeader, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/base';
import { useCreateEmailDomain, useEmailDomains, useVerifyEmailDomain } from '@/hooks/useEmailHosting';
import type { EmailDomainStatus } from '@/lib/api/email-hosting';
import { Copy, Globe2, Loader2, Plus, ShieldCheck, ShieldX, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

function statusBadge(status: EmailDomainStatus) {
  if (status === 'VERIFIED') {
    return (
      <Badge className="gap-1 bg-emerald-500/10 text-emerald-600">
        <ShieldCheck className="h-3 w-3" /> Verified
      </Badge>
    );
  }
  if (status === 'FAILED') {
    return (
      <Badge className="gap-1 bg-destructive/10 text-destructive">
        <ShieldX className="h-3 w-3" /> Failed
      </Badge>
    );
  }
  return <Badge className="bg-amber-500/10 text-amber-600">Pending DNS</Badge>;
}

/**
 * Self-service custom-domain onboarding (plan Part 1.3): add a domain, get
 * back the DNS records Stalwart auto-generated, publish them with the
 * domain's real registrar, then Verify — which doubles as Zoho's own
 * "Domains with MX/SPF/DKIM" security checklist once verified.
 */
export function EmailHostingDomainsSection() {
  const { data: domains = [], isLoading } = useEmailDomains();
  const createMutation = useCreateEmailDomain();
  const verifyMutation = useVerifyEmailDomain();

  const [showAdd, setShowAdd] = useState(false);
  const [domainName, setDomainName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleCreate() {
    if (!domainName.trim()) return;
    const created = await createMutation.mutateAsync(domainName.trim().toLowerCase());
    setShowAdd(false);
    setDomainName('');
    setExpandedId(created.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your domains</h2>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add domain
        </Button>
      </div>

      {showAdd && (
        <Card className="border-primary/20 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Add domain</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex gap-3 p-6">
            <Input value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="yourdomain.com" className="flex-1" />
            <Button onClick={handleCreate} disabled={!domainName.trim() || createMutation.isPending} className="gap-2">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : domains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                  No custom domains yet — mailboxes use the shared platform domain until you add one.
                </TableCell>
              </TableRow>
            ) : (
              domains.map((d) => (
                <>
                  <TableRow key={d.id}>
                    <TableCell>
                      <button
                        onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                        className="flex items-center gap-2 font-medium hover:text-primary"
                      >
                        <Globe2 className="h-4 w-4 text-primary" /> {d.domain}
                      </button>
                    </TableCell>
                    <TableCell>{statusBadge(d.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => verifyMutation.mutate(d.id)} disabled={verifyMutation.isPending} className="gap-1.5">
                        {verifyMutation.isPending && verifyMutation.variables === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Verify now
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedId === d.id && (
                    <TableRow key={`${d.id}-expanded`}>
                      <TableCell colSpan={3}>
                        <div className="rounded-xl bg-accent/40 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">DNS records to publish with {d.domain}&apos;s registrar</p>
                            <button
                              onClick={() => {
                                void navigator.clipboard.writeText(d.metadata?.dns_zone_file ?? '');
                                toast.success('Copied');
                              }}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3 w-3" /> Copy
                            </button>
                          </div>
                          <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                            {d.metadata?.dns_zone_file || 'No DNS zone information available.'}
                          </pre>
                          {d.status === 'FAILED' && d.failure_reason && (
                            <p className="mt-2 text-xs text-destructive">{d.failure_reason}</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

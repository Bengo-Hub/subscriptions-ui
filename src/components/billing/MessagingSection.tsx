'use client'

import { Loader2, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button } from '@/components/ui/base'
import { SectionCard } from '@/components/ui/page-header'
import { useCredits, useSetCreditAutoRenew } from '@/hooks/useCredits'
import { purchaseCredits, type CreditServiceCode, type CreditSnapshot } from '@/lib/api/credits'
import { fmtMoney } from '@/lib/billing/format'

type Checkout = (args: { intentId: string; initiateUrl: string; amount: number; label: string }) => void

function ServiceBlock({ snap, onCheckout }: { snap: CreditSnapshot; onCheckout: Checkout }) {
  const [busy, setBusy] = useState<string | null>(null)
  const autoRenew = useSetCreditAutoRenew()
  const service = snap.service as CreditServiceCode
  const tiers = snap.tiers ?? []
  const currentTier = tiers.find((t) => t.code === snap.tier_code)

  const buy = async (kind: 'bundle' | 'tier', code: string, amount: number, label: string) => {
    setBusy(`${kind}:${code}`)
    try {
      const res = await purchaseCredits(service, { kind, code, return_url: `${window.location.origin}/billing?credits=${service}` })
      if (res.initiate_url && res.intent_id) {
        onCheckout({ intentId: res.intent_id, initiateUrl: res.initiate_url, amount, label })
      } else if (res.authorization_url) {
        window.location.href = res.authorization_url
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Could not start the payment. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold">{snap.label}</p>
          <p className="text-xs text-muted-foreground">
            {snap.exempt
              ? 'Included, never billed'
              : `${snap.bundle_balance.toLocaleString()} bundle units left`}
            {!snap.exempt && tiers.length > 0 && (snap.unlimited ? ', unlimited plan messages' : `, ${snap.quota_balance.toLocaleString()} plan messages left`)}
          </p>
        </div>
        {!snap.exempt && <Badge variant={snap.covered ? 'success' : 'warning'}>{snap.covered ? 'Active' : 'Not active'}</Badge>}
      </div>

      {!snap.exempt && snap.overage_pending_kes > 0 && (
        <p className="text-sm">
          Owed for extra messages: <span className="font-semibold">{fmtMoney(snap.overage_pending_kes)}</span> of {fmtMoney(snap.overage_cap_kes)}. It is added to your next bill.
        </p>
      )}

      {!snap.exempt && tiers.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Monthly plan</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {tiers.map((t) => (
              <Button
                key={t.code}
                variant={snap.tier_code === t.code ? 'outline' : 'primary'}
                size="sm"
                className="h-auto flex-col items-start py-2"
                disabled={busy !== null}
                onClick={() => buy('tier', t.code, t.price_kes, `${snap.label} ${t.name}`)}
              >
                {busy === `tier:${t.code}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="font-semibold">{t.name}, {fmtMoney(t.price_kes)}</span>
                    <span className="text-xs font-normal opacity-80">
                      {t.monthly_units < 0 ? 'Unlimited' : `${t.monthly_units.toLocaleString()} a month`}
                      {snap.tier_code === t.code ? ', renew now' : ''}
                    </span>
                  </>
                )}
              </Button>
            ))}
          </div>
          {currentTier && (
            <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={snap.auto_renew}
                disabled={autoRenew.isPending}
                onChange={(e) => autoRenew.mutate({ service, on: e.target.checked })}
              />
              Add this plan to my bill each period
              {snap.tier_period_end ? `, paid until ${new Date(snap.tier_period_end).toLocaleDateString()}` : ''}
            </label>
          )}
        </div>
      )}

      {!snap.exempt && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Buy a bundle</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {snap.bundles.map((b) => (
              <Button
                key={b.code}
                variant="outline"
                size="sm"
                className="h-auto flex-col py-2"
                disabled={busy !== null}
                onClick={() => buy('bundle', b.code, b.price_kes, `${snap.label} bundle, ${b.units.toLocaleString()}`)}
              >
                {busy === `bundle:${b.code}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="font-semibold">{b.units.toLocaleString()}</span>
                    <span className="text-xs font-normal text-muted-foreground">{fmtMoney(b.price_kes)}</span>
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** SMS and WhatsApp balances with plan and bundle purchases, paid through the same checkout as a bill. */
export function MessagingSection({ onCheckout }: { onCheckout: Checkout }) {
  const { data, isLoading } = useCredits()
  const services = data ?? []

  return (
    <SectionCard
      title="SMS and WhatsApp"
      icon={MessageSquare}
      description="Each message beyond your plan and bundles costs KES 1 and is added to your next bill."
    >
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
        </p>
      ) : services.length === 0 ? (
        <p className="text-sm text-muted-foreground">Messaging is not available for this account.</p>
      ) : (
        <div className="space-y-4">
          {services.map((s) => (
            <ServiceBlock key={s.service} snap={s} onCheckout={onCheckout} />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

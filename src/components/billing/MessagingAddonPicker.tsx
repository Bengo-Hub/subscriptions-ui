'use client'

import { Loader2 } from 'lucide-react'
import { useCredits } from '@/hooks/useCredits'
import type { CheckoutAddon, CreditSnapshot } from '@/lib/api/credits'

/** What the tenant picked for messaging at plan checkout. Each field is a code, or '' for none. */
export interface MessagingSelection {
  smsBundle: string
  whatsappTier: string
  whatsappBundle: string
}

export const NO_MESSAGING: MessagingSelection = { smsBundle: '', whatsappTier: '', whatsappBundle: '' }

export function selectionToAddons(sel: MessagingSelection): CheckoutAddon[] {
  const out: CheckoutAddon[] = []
  if (sel.smsBundle) out.push({ service: 'sms', kind: 'bundle', code: sel.smsBundle })
  if (sel.whatsappTier) out.push({ service: 'whatsapp', kind: 'tier', code: sel.whatsappTier })
  if (sel.whatsappBundle) out.push({ service: 'whatsapp', kind: 'bundle', code: sel.whatsappBundle })
  return out
}

interface PricedLine {
  label: string
  amount: number
}

/** Priced lines for the order summary. Tiers are charged for every month of the billing period. */
export function selectionLines(services: CreditSnapshot[] | undefined, sel: MessagingSelection, months: number): PricedLine[] {
  const lines: PricedLine[] = []
  const sms = services?.find((s) => s.service === 'sms')
  const wa = services?.find((s) => s.service === 'whatsapp')
  const smsBundle = sms?.bundles.find((b) => b.code === sel.smsBundle)
  if (smsBundle) lines.push({ label: `SMS bundle, ${smsBundle.units.toLocaleString()}`, amount: smsBundle.price_kes })
  const tier = wa?.tiers?.find((t) => t.code === sel.whatsappTier)
  if (tier) lines.push({ label: `WhatsApp ${tier.name}, ${months} month${months > 1 ? 's' : ''}`, amount: tier.price_kes * months })
  const waBundle = wa?.bundles.find((b) => b.code === sel.whatsappBundle)
  if (waBundle) lines.push({ label: `WhatsApp bundle, ${waBundle.units.toLocaleString()}`, amount: waBundle.price_kes })
  return lines
}

export function selectionTotal(services: CreditSnapshot[] | undefined, sel: MessagingSelection, months: number): number {
  return selectionLines(services, sel, months).reduce((sum, l) => sum + l.amount, 0)
}

function Choice({ active, onClick, title, hint }: { active: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40'}`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block text-[11px] text-muted-foreground mt-0.5">{hint}</span>
    </button>
  )
}

/**
 * Optional SMS and WhatsApp add-ons for a plan checkout, paid in the same payment as the plan.
 * Offers and prices come from the server; nothing here is priced locally.
 */
export function MessagingAddonPicker({
  value,
  onChange,
  months,
  currency = 'KES',
}: {
  value: MessagingSelection
  onChange: (next: MessagingSelection) => void
  months: number
  currency?: string
}) {
  const { data, isLoading, isError } = useCredits()
  const sms = data?.find((s) => s.service === 'sms')
  const wa = data?.find((s) => s.service === 'whatsapp')

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading messaging options…
      </p>
    )
  }
  if (isError || (!sms && !wa)) return null
  if ((sms?.exempt ?? false) && (wa?.exempt ?? false)) return null

  const set = (patch: Partial<MessagingSelection>) => onChange({ ...value, ...patch })
  const money = (n: number) => `${currency} ${n.toLocaleString()}`

  return (
    <div className="mb-6 space-y-5">
      <div>
        <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">Messaging (optional)</span>
        <p className="text-xs text-muted-foreground mt-1">
          Each SMS and WhatsApp message beyond your plan and bundles costs KES 1 and is added to your next invoice.
        </p>
      </div>

      {sms && (
        <div>
          <p className="text-sm font-semibold mb-2">SMS bundle</p>
          <div className="grid grid-cols-2 gap-2">
            <Choice active={value.smsBundle === ''} onClick={() => set({ smsBundle: '' })} title="None" hint="Pay KES 1 per SMS" />
            {sms.bundles.map((b) => (
              <Choice key={b.code} active={value.smsBundle === b.code} onClick={() => set({ smsBundle: b.code })} title={`${b.units.toLocaleString()} SMS`} hint={money(b.price_kes)} />
            ))}
          </div>
        </div>
      )}

      {wa && (
        <>
          <div>
            <p className="text-sm font-semibold mb-2">WhatsApp plan</p>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={value.whatsappTier === ''} onClick={() => set({ whatsappTier: '' })} title="None" hint="No monthly plan" />
              {(wa.tiers ?? []).map((t) => (
                <Choice
                  key={t.code}
                  active={value.whatsappTier === t.code}
                  onClick={() => set({ whatsappTier: t.code })}
                  title={`${t.name}, ${money(t.price_kes)} / month`}
                  hint={t.monthly_units < 0 ? 'Unlimited messages' : `${t.monthly_units.toLocaleString()} messages a month`}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">WhatsApp bundle</p>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={value.whatsappBundle === ''} onClick={() => set({ whatsappBundle: '' })} title="None" hint="Extra messages cost KES 1" />
              {wa.bundles.map((b) => (
                <Choice key={b.code} active={value.whatsappBundle === b.code} onClick={() => set({ whatsappBundle: b.code })} title={`${b.units.toLocaleString()} messages`} hint={money(b.price_kes)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

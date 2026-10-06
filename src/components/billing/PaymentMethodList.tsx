'use client'

import { useState } from 'react'
import { CreditCard, Plus, Smartphone, Star } from 'lucide-react'
import { Button } from '@/components/ui/base'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { PaymentMethod } from '@/types/billing'

interface PaymentMethodListProps {
  methods: PaymentMethod[]
  onAddMethod: () => void
  onSetDefault: (last4OrPhone: string) => void
  onRemove: (last4OrPhone: string) => void
  isPendingDefault: boolean
  isPendingRemove: boolean
  isSetupPending: boolean
}

function methodKey(m: PaymentMethod): string {
  return m.type === 'card' ? m.last4 : m.phone
}

function methodTitle(m: PaymentMethod): string {
  if (m.type === 'card') return `${m.brand ? m.brand.split(' ')[0] : 'Card'} ending ${m.last4}`
  const digits = (m.phone ?? '').replace(/\D/g, '')
  return `${m.provider || 'M-Pesa'} ••• ${digits.slice(-3)}`
}

/**
 * Saved cards and mobile money used for automatic renewals. Compact rows that fit a phone; paying
 * an invoice never needs one of these (the page's Pay button takes M-Pesa or card directly).
 */
export function PaymentMethodList({
  methods,
  onAddMethod,
  onSetDefault,
  onRemove,
  isPendingDefault,
  isPendingRemove,
  isSetupPending,
}: PaymentMethodListProps) {
  const [removing, setRemoving] = useState<PaymentMethod | null>(null)
  // Any saved method can be removed at any time; with none left, renewals come as invoices.
  const removingLast = methods.length === 1

  return (
    <div className="space-y-3">
      {methods.length === 0 ? (
        <p className="text-sm text-muted-foreground">No card saved. Add one only if you want renewals charged automatically.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {methods.map((m, idx) => {
            const Icon = m.type === 'card' ? CreditCard : Smartphone
            const isDefault = idx === 0
            return (
              <li key={`${m.type}-${methodKey(m)}`} className="flex flex-wrap items-center gap-3 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{methodTitle(m)}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.type === 'card' ? `Expires ${m.expiryMonth}/${m.expiryYear}` : 'Mobile money'}
                  </p>
                </div>
                {isDefault ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    <Star className="h-3 w-3" aria-hidden /> Used for renewals
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => onSetDefault(methodKey(m))} disabled={isPendingDefault}>
                    Use for renewals
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setRemoving(m)}
                >
                  Remove
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <Button variant="outline" size="sm" onClick={onAddMethod} disabled={isSetupPending}>
        <Plus className="h-4 w-4" aria-hidden />
        {isSetupPending ? 'Opening…' : methods.length ? 'Add another card' : 'Save a card for automatic renewal'}
      </Button>
      {methods.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Saving a card charges KES 5 to check it, refunded automatically.
        </p>
      )}

      <ConfirmDialog
        open={!!removing}
        title="Remove this payment method?"
        description={
          removing
            ? `${methodTitle(removing)} will be deleted and never charged again.` +
              (removingLast ? ' Your next renewal will come as an invoice for you to pay.' : '')
            : undefined
        }
        confirmLabel="Remove"
        pending={isPendingRemove}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) onRemove(methodKey(removing))
          setRemoving(null)
        }}
      />
    </div>
  )
}

'use client'

import { PaymentMethodCard } from './PaymentMethodCard'
import type { PaymentMethod } from '@/types/billing'
import { Plus } from 'lucide-react'

interface PaymentMethodListProps {
  methods: PaymentMethod[]
  status?: string
  cancelAtPeriodEnd?: boolean
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

export function PaymentMethodList({
  methods,
  status,
  cancelAtPeriodEnd,
  onAddMethod,
  onSetDefault,
  onRemove,
  isPendingDefault,
  isPendingRemove,
  isSetupPending,
}: PaymentMethodListProps) {
  const isActive = status === 'ACTIVE'
  // Remove is only allowed when subscription is not active OR cancellation is pending at period end.
  const removeAllowed = !isActive || cancelAtPeriodEnd === true

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment Methods</h3>
        <button
          onClick={onAddMethod}
          disabled={isSetupPending}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {isSetupPending ? 'Starting…' : 'Add Method'}
        </button>
      </div>

      {methods.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">No payment method on file.</p>
          <button
            onClick={onAddMethod}
            disabled={isSetupPending}
            className="text-xs font-semibold text-primary hover:text-primary/80 underline underline-offset-2 disabled:opacity-40"
          >
            {isSetupPending ? 'Setting up…' : '+ Add a Payment Method'}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {methods.map((m, idx) => (
            <PaymentMethodCard
              key={`${m.type}-${methodKey(m)}`}
              method={m}
              isDefault={idx === 0}
              canRemove={methods.length > 1 && removeAllowed}
              onSetDefault={() => onSetDefault(methodKey(m))}
              onRemove={() => onRemove(methodKey(m))}
              isPendingDefault={isPendingDefault}
              isPendingRemove={isPendingRemove}
            />
          ))}
        </div>
      )}

      {isActive && !cancelAtPeriodEnd && methods.length > 1 && (
        <p className="text-[11px] text-muted-foreground">
          To remove a payment method, first cancel your subscription (takes effect at period end).
        </p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { PaymentMethod } from '@/types/billing'

interface PaymentMethodCardProps {
  method: PaymentMethod
  isDefault: boolean
  canRemove: boolean
  onSetDefault: () => void
  onRemove: () => void
  isPendingDefault: boolean
  isPendingRemove: boolean
}

function ChipSVG() {
  return (
    <svg width="38" height="28" viewBox="0 0 38 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="37" height="27" rx="4.5" fill="#D4A843" stroke="#B8902D" />
      <rect x="13" y="0.5" width="12" height="27" rx="0" fill="#C09030" />
      <rect x="0.5" y="9" width="37" height="10" fill="#C09030" />
      <rect x="13" y="9" width="12" height="10" fill="#B07820" />
    </svg>
  )
}

function VisaLogo() {
  return (
    <span className="font-black italic text-white tracking-widest text-xl select-none" style={{ fontFamily: 'serif', letterSpacing: '0.05em' }}>
      VISA
    </span>
  )
}

function MastercardLogo() {
  return (
    <span className="flex items-center gap-0" title="Mastercard">
      <span className="h-7 w-7 rounded-full bg-red-500 opacity-90 -mr-3 block" />
      <span className="h-7 w-7 rounded-full bg-yellow-400 opacity-90 block" />
    </span>
  )
}

function MpesaLogo() {
  return (
    <span className="font-black text-white tracking-wider text-base select-none" style={{ letterSpacing: '0.04em' }}>
      M-PESA
    </span>
  )
}

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length >= 9) {
    const last3 = cleaned.slice(-3)
    return `+254 ••• ••• ${last3}`
  }
  return `••• ••• ${phone.slice(-3)}`
}

export function PaymentMethodCard({
  method,
  isDefault,
  canRemove,
  onSetDefault,
  onRemove,
  isPendingDefault,
  isPendingRemove,
}: PaymentMethodCardProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const isCard = method.type === 'card'
  const isMpesa = method.type === 'mobile_money'

  const brand = isCard ? method.brand.toLowerCase() : ''
  const isMastercard = brand.includes('master')

  const cardGradient = isCard
    ? isMastercard
      ? 'from-zinc-900 via-zinc-800 to-zinc-700'
      : 'from-[#1a1f5e] via-[#1c3a8c] to-[#0e2255]'
    : 'from-[#006635] via-[#00843D] to-[#00A651]'

  return (
    <div className="flex flex-col gap-2">
      {/* Card face */}
      <div
        className={`relative rounded-2xl bg-gradient-to-br ${cardGradient} text-white select-none overflow-hidden shadow-xl`}
        style={{ aspectRatio: '1.586 / 1', width: '100%', maxWidth: 320, minWidth: 240 }}
      >
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full bg-white/5" />

        {/* Default badge */}
        {isDefault && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
            <span className="text-yellow-300 text-[10px]">★</span>
            <span className="text-[10px] font-semibold text-white/90">Default</span>
          </div>
        )}

        {/* Brand logo */}
        <div className="absolute top-4 right-4">
          {isCard
            ? isMastercard
              ? <MastercardLogo />
              : <VisaLogo />
            : <MpesaLogo />}
        </div>

        {/* Card content */}
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <div />

          {/* Chip (card only) */}
          <div>
            {isCard && (
              <div className="mb-3">
                <ChipSVG />
              </div>
            )}

            {/* Card number / phone */}
            <div className="font-mono tracking-[0.2em] text-base font-bold mb-3">
              {isCard
                ? `•••• •••• •••• ${method.last4}`
                : maskPhone(method.phone)}
            </div>

            {/* Bottom row */}
            <div className="flex items-end justify-between">
              <div>
                {isCard ? (
                  <div>
                    <p className="text-[9px] font-medium text-white/50 uppercase tracking-widest mb-0.5">Valid Thru</p>
                    <p className="text-sm font-semibold">{method.expiryMonth}/{method.expiryYear}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[9px] font-medium text-white/50 uppercase tracking-widest mb-0.5">Mobile Money</p>
                    <p className="text-sm font-semibold capitalize">{method.provider}</p>
                  </div>
                )}
              </div>
              {isCard && (
                <div className="text-right">
                  <p className="text-[9px] font-medium text-white/50 uppercase tracking-widest mb-0.5">Type</p>
                  <p className="text-xs font-semibold uppercase">{method.brand}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-1">
        {!isDefault && (
          <button
            onClick={onSetDefault}
            disabled={isPendingDefault}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-40"
          >
            {isPendingDefault ? 'Updating…' : 'Set as Default'}
          </button>
        )}

        {canRemove && (
          <>
            {showRemoveConfirm ? (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-destructive">Remove this method?</span>
                <button
                  onClick={() => { onRemove(); setShowRemoveConfirm(false) }}
                  disabled={isPendingRemove}
                  className="text-xs font-semibold text-destructive hover:text-destructive/80 disabled:opacity-40"
                >
                  {isPendingRemove ? 'Removing…' : 'Yes, Remove'}
                </button>
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="text-xs text-destructive/70 hover:text-destructive ml-auto underline underline-offset-2"
              >
                Remove
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

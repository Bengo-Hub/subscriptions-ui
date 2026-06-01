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
    <svg width="36" height="26" viewBox="0 0 38 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="37" height="27" rx="4.5" fill="#D4A843" stroke="#B8902D" />
      <rect x="13" y="0.5" width="12" height="27" rx="0" fill="#C09030" />
      <rect x="0.5" y="9" width="37" height="10" fill="#C09030" />
      <rect x="13" y="9" width="12" height="10" fill="#B07820" />
    </svg>
  )
}

function VisaLogo() {
  return (
    <span
      className="font-black italic text-white select-none"
      style={{ fontFamily: 'serif', fontSize: '1.25rem', letterSpacing: '0.04em' }}
    >
      VISA
    </span>
  )
}

function MastercardLogo() {
  return (
    <span className="flex items-center" title="Mastercard">
      <span className="h-6 w-6 rounded-full bg-red-500 opacity-90 -mr-2.5 block" />
      <span className="h-6 w-6 rounded-full bg-yellow-400 opacity-90 block" />
    </span>
  )
}

function MpesaLogo() {
  return (
    <span
      className="font-black text-white select-none"
      style={{ fontSize: '0.85rem', letterSpacing: '0.06em' }}
    >
      M-PESA
    </span>
  )
}

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length >= 9) {
    return `+254 ••• ••• ${cleaned.slice(-3)}`
  }
  return `••• ••• ${phone.slice(-3)}`
}

/** Shorten overly long brand strings like "MASTERCARD DEBIT" → "MASTERCARD" */
function shortBrand(brand: string): string {
  const b = brand.toUpperCase()
  if (b.startsWith('MASTERCARD')) return 'MASTERCARD'
  if (b.startsWith('VISA')) return 'VISA'
  if (b.startsWith('VERVE')) return 'VERVE'
  if (b.startsWith('AMEX') || b.startsWith('AMERICAN')) return 'AMEX'
  // Truncate anything longer than 10 chars
  return b.length > 10 ? b.slice(0, 10) : b
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
  const brand = isCard ? method.brand.toLowerCase() : ''
  const isMastercard = brand.includes('master')

  const cardGradient = isCard
    ? isMastercard
      ? 'from-zinc-900 via-zinc-800 to-zinc-700'
      : 'from-[#1a1f5e] via-[#1c3a8c] to-[#0e2255]'
    : 'from-[#006635] via-[#00843D] to-[#00A651]'

  return (
    <div className="flex flex-col gap-2">
      {/* Card face — fixed width so layout is predictable */}
      <div
        className={`relative rounded-2xl bg-gradient-to-br ${cardGradient} text-white select-none overflow-hidden shadow-xl`}
        style={{ width: 300, height: 188 }}
      >
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
        <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full bg-white/5" />

        {/* ── TOP ROW: chip (left) + brand logo (right) ── */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-5 pt-5">
          {isCard ? <ChipSVG /> : <div />}
          {isCard
            ? isMastercard ? <MastercardLogo /> : <VisaLogo />
            : <MpesaLogo />}
        </div>

        {/* Default badge — centered at the top */}
        {isDefault && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 whitespace-nowrap">
            <span className="text-yellow-300 text-[9px]">★</span>
            <span className="text-[9px] font-semibold text-white/90">Default</span>
          </div>
        )}

        {/* ── MIDDLE: card number ── */}
        <div className="absolute inset-x-5 top-1/2 -translate-y-1/2">
          <p
            className="font-mono font-bold text-white whitespace-nowrap"
            style={{ fontSize: '0.95rem', letterSpacing: '0.16em' }}
          >
            {isCard
              ? `•••• •••• •••• ${method.last4}`
              : maskPhone(method.phone)}
          </p>
        </div>

        {/* ── BOTTOM ROW: valid thru (left) + type (right) ── */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-5 pb-4">
          <div>
            <p className="text-[8px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">
              {isCard ? 'Valid Thru' : 'Mobile Money'}
            </p>
            <p className="text-sm font-semibold leading-none">
              {isCard
                ? `${method.expiryMonth}/${method.expiryYear}`
                : <span className="capitalize">{method.provider}</span>}
            </p>
          </div>

          {isCard && (
            <div className="text-right">
              <p className="text-[8px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">Type</p>
              <p className="text-[11px] font-semibold uppercase leading-none">
                {shortBrand(method.brand)}
              </p>
            </div>
          )}
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

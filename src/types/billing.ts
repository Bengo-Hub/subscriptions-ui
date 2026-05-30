export interface PaymentMethod {
  type: 'card'
  brand: string
  last4: string
  expiryMonth: string
  expiryYear: string
}

export interface Invoice {
  id: string
  date: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed' | 'void'
  description: string
  pdfUrl?: string
}

export interface OverageLine {
  metricType: string
  unitsOver: number
  unitPriceKes: number
  totalKes: number
}

export interface AddonLine {
  name: string
  quantity: number
  unitPriceKes: number
  totalKes: number
  billingCycle: string
}

export interface InvoicePreview {
  basePlanPriceKes: number
  overageCharges: OverageLine[]
  overageTotalKes: number
  customAddons: AddonLine[]
  addonsTotalKes: number
  creditsAvailableKes: number
  creditsToApplyKes: number
  estimatedTotalKes: number
  currency: string
}

export interface CreditTransaction {
  id: string
  type: string
  amountKes: number
  description: string
  createdAt: string
}

export interface CreditWallet {
  balanceKes: number
  transactions: CreditTransaction[]
}

export interface BillingInfo {
  hasSubscription: boolean
  subscriptionId?: string
  status?: string
  billingCycle?: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  nextRenewalDate?: string
  planCode?: string
  planName?: string
  amount?: number
  nextAmount?: number
  currency?: string
  paymentMethod?: PaymentMethod
  invoices: Invoice[]
}

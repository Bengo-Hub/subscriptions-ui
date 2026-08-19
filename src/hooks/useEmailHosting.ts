'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  assignEmailLicense,
  createEmailDomain,
  listEmailDomains,
  listEmailLicenses,
  listEmailPlans,
  purchaseEmailLicenses,
  suspendEmailLicense,
  unassignEmailLicense,
  upgradeEmailLicense,
  verifyEmailDomain,
} from '@/lib/api/email-hosting'
import { useTenantFilterStore } from '@/store/tenant-filter'

// Mirrors useCustomAddons.ts's exact React Query pattern — tenant-filter-scoped
// query keys so a platform owner browsing a specific tenant (via the top-nav
// filter) sees that tenant's own data, not their own.

function useTenantKey() {
  return useTenantFilterStore((s) => s.selectedTenant)?.id ?? null
}

export function useEmailPlans() {
  return useQuery({ queryKey: ['email-plans'], queryFn: listEmailPlans, staleTime: 5 * 60_000 })
}

export function useEmailLicenses() {
  const tenantKey = useTenantKey()
  return useQuery({ queryKey: ['email-licenses', tenantKey], queryFn: listEmailLicenses, staleTime: 30_000 })
}

export function useEmailDomains() {
  const tenantKey = useTenantKey()
  return useQuery({ queryKey: ['email-domains', tenantKey], queryFn: listEmailDomains, staleTime: 30_000 })
}

export function usePurchaseEmailLicenses() {
  const qc = useQueryClient()
  const tenantKey = useTenantKey()
  return useMutation({
    mutationFn: ({ planCode, quantity, returnUrl }: { planCode: string; quantity: number; returnUrl?: string }) =>
      purchaseEmailLicenses(planCode, quantity, returnUrl),
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to purchase licenses'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['email-licenses', tenantKey] }),
  })
}

export function useAssignEmailLicense() {
  const qc = useQueryClient()
  const tenantKey = useTenantKey()
  return useMutation({
    mutationFn: ({ licenseId, email, notifyEmail }: { licenseId: string; email: string; notifyEmail?: string }) =>
      assignEmailLicense(licenseId, email, notifyEmail),
    onSuccess: () => {
      toast.success('License assigned — a setup link will be sent to the notify address')
      qc.invalidateQueries({ queryKey: ['email-licenses', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to assign license'),
  })
}

export function useUnassignEmailLicense() {
  const qc = useQueryClient()
  const tenantKey = useTenantKey()
  return useMutation({
    mutationFn: (licenseId: string) => unassignEmailLicense(licenseId),
    onSuccess: () => {
      toast.success('License unassigned and returned to the pool')
      qc.invalidateQueries({ queryKey: ['email-licenses', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to unassign license'),
  })
}

export function useUpgradeEmailLicense() {
  const qc = useQueryClient()
  const tenantKey = useTenantKey()
  return useMutation({
    mutationFn: ({ licenseId, planCode }: { licenseId: string; planCode: string }) => upgradeEmailLicense(licenseId, planCode),
    onSuccess: () => {
      toast.success('License upgraded')
      qc.invalidateQueries({ queryKey: ['email-licenses', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to upgrade license'),
  })
}

export function useSuspendEmailLicense() {
  const qc = useQueryClient()
  const tenantKey = useTenantKey()
  return useMutation({
    mutationFn: ({ licenseId, reason }: { licenseId: string; reason?: string }) => suspendEmailLicense(licenseId, reason),
    onSuccess: () => {
      toast.success('License suspended')
      qc.invalidateQueries({ queryKey: ['email-licenses', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to suspend license'),
  })
}

export function useCreateEmailDomain() {
  const qc = useQueryClient()
  const tenantKey = useTenantKey()
  return useMutation({
    mutationFn: (domain: string) => createEmailDomain(domain),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-domains', tenantKey] }),
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create domain'),
  })
}

export function useVerifyEmailDomain() {
  const qc = useQueryClient()
  const tenantKey = useTenantKey()
  return useMutation({
    mutationFn: (domainId: string) => verifyEmailDomain(domainId),
    onSuccess: (domain) => {
      if (domain.status === 'VERIFIED') toast.success(`${domain.domain} verified`)
      else toast.error(domain.failure_reason ?? `${domain.domain} is not verified yet`)
      qc.invalidateQueries({ queryKey: ['email-domains', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to verify domain'),
  })
}

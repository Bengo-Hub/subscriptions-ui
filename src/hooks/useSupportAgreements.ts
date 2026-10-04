'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createSupportAgreement,
  getTenantSupportAgreements,
  issueSupportChargeInvoice,
  listSupportCharges,
  updateSupportAgreement,
  updateSupportCharge,
  type SupportAgreementInput,
  type SupportChargeFilters,
} from '@/lib/api/support'

const errorText = (e: any, fallback: string) => e?.response?.data?.error ?? e?.message ?? fallback

export function useTenantSupportAgreements(tenantId?: string) {
  return useQuery({
    queryKey: ['support-agreements', tenantId],
    queryFn: () => getTenantSupportAgreements(tenantId!),
    enabled: !!tenantId,
    staleTime: 30_000,
  })
}

export function useSupportCharges(filters: SupportChargeFilters, enabled = true) {
  return useQuery({
    queryKey: ['support-charges', filters],
    queryFn: () => listSupportCharges(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** Every support mutation changes agreements, charges and platform totals, so refresh all three. */
function useSupportInvalidation() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['support-agreements'] })
    qc.invalidateQueries({ queryKey: ['support-charges'] })
    qc.invalidateQueries({ queryKey: ['platform-stats'] })
  }
}

export function useCreateSupportAgreement() {
  const refresh = useSupportInvalidation()
  return useMutation({
    mutationFn: ({ tenantId, input }: { tenantId: string; input: SupportAgreementInput }) =>
      createSupportAgreement(tenantId, input),
    onSuccess: () => {
      refresh()
      toast.success('Support agreement created')
    },
    onError: (e) => toast.error(errorText(e, 'Failed to create support agreement')),
  })
}

export function useUpdateSupportAgreement() {
  const refresh = useSupportInvalidation()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupportAgreementInput }) => updateSupportAgreement(id, input),
    onSuccess: () => {
      refresh()
      toast.success('Support agreement updated')
    },
    onError: (e) => toast.error(errorText(e, 'Failed to update support agreement')),
  })
}

export function useUpdateSupportCharge() {
  const refresh = useSupportInvalidation()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateSupportCharge>[1] }) =>
      updateSupportCharge(id, body),
    onSuccess: (_, { body }) => {
      refresh()
      toast.success(
        body.status === 'PAID' ? 'Payment recorded' : body.status === 'WAIVED' ? 'Charge waived' : 'Charge repriced',
      )
    },
    onError: (e) => toast.error(errorText(e, 'Failed to update charge')),
  })
}

export function useIssueSupportInvoice() {
  const refresh = useSupportInvalidation()
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => issueSupportChargeInvoice(id, force),
    onSuccess: () => {
      refresh()
      toast.success('Invoice sent')
    },
    onError: (e) => toast.error(errorText(e, 'Failed to issue invoice')),
  })
}

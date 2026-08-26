import { apiClient } from './client';

export interface WalletSnapshot {
  balance: number;
  lifetime_granted: number;
  low_balance_threshold: number;
  low_balance: boolean;
}

export interface TokenTransaction {
  id: string;
  action: 'grant' | 'topup' | 'deduction' | 'refund' | 'adjustment';
  tokens: number;
  new_balance: number;
  endpoint_pattern?: string;
  unit_cost_kes?: number;
  description?: string;
  created_at: string;
}

export interface TokenTransactionsResponse {
  data: TokenTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlanComparison {
  plan_code: string;
  name: string;
  monthly_price_kes: number;
  included_tokens: number;
  token_price_kes: number;
  covers_estimate: boolean;
  projected_topup_kes: number;
}

export interface TokenEstimateResponse {
  tokens_per_month: number;
  recommended_plan?: string;
  plans_compared: PlanComparison[];
}

export const DEFAULT_TOKEN_SERVICE_TAG = 'etims_api';

export const getTokenBalance = (tenantId: string, serviceTag = DEFAULT_TOKEN_SERVICE_TAG) =>
  apiClient.get<WalletSnapshot>(`/api/v1/tenants/${tenantId}/tokens/balance`, { service_tag: serviceTag });

export const getTokenTransactions = (
  tenantId: string,
  serviceTag = DEFAULT_TOKEN_SERVICE_TAG,
  limit = 20,
  offset = 0,
) =>
  apiClient.get<TokenTransactionsResponse>(`/api/v1/tenants/${tenantId}/tokens/transactions`, {
    service_tag: serviceTag,
    limit,
    offset,
  });

export const initiateTokenTopUp = (
  tenantId: string,
  amountKes: number,
  returnUrl: string,
  serviceTag = DEFAULT_TOKEN_SERVICE_TAG,
) =>
  apiClient.post<Record<string, any>>(`/api/v1/tenants/${tenantId}/tokens/topup`, {
    service_tag: serviceTag,
    amount_kes: amountKes,
    return_url: returnUrl,
  });

export const estimateTokenUsage = (input: {
  serviceTag?: string;
  avgSalesPerDay?: number;
  daysPerMonth?: number;
  callsPerDay?: Record<string, number>;
}) =>
  apiClient.post<TokenEstimateResponse>('/api/v1/tokens/estimate', {
    service_tag: input.serviceTag ?? DEFAULT_TOKEN_SERVICE_TAG,
    avg_sales_per_day: input.avgSalesPerDay,
    days_per_month: input.daysPerMonth,
    calls_per_day: input.callsPerDay,
  });

import { create } from 'zustand';

export interface TenantOption {
  id: string;
  slug: string;
  name: string;
}

interface TenantFilterState {
  /** Single selected tenant for platform-level filtering. null = "All Tenants". */
  selectedTenant: TenantOption | null;
  setSelectedTenant: (tenant: TenantOption | null) => void;
  clearTenant: () => void;
  /** UUID string ready for ?tenant_id= query param. Empty string when "all". */
  tenantIdParam: () => string;
}

export const useTenantFilterStore = create<TenantFilterState>((set, get) => ({
  selectedTenant: null,

  setSelectedTenant: (tenant) => set({ selectedTenant: tenant }),

  clearTenant: () => set({ selectedTenant: null }),

  tenantIdParam: () => get().selectedTenant?.id ?? '',
}));

import { fetchTenantBySlug, type TenantBrand } from '@/lib/tenant-api';
import { useParams } from 'next/navigation';
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

interface TenantBrandingContextType {
  slug: string;
  tenant: TenantBrand | null;
  isLoading: boolean;
  error: Error | null;
  getServiceTitle: (appName: string) => string;
}

const TenantBrandingContext = createContext<TenantBrandingContextType | undefined>(undefined);

const DEFAULT_BRAND: TenantBrand = {
  id: 'platform',
  name: 'Codevertex',
  slug: 'codevertex',
  logoUrl: '/images/logo/codevertex.png',
  primaryColor: '#5B1C4D',
  secondaryColor: '#ea8022',
  orgName: 'Codevertex IT Solutions',
};

export function TenantBrandingProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const slug = (params?.orgSlug as string) || '';

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', slug],
    queryFn: () => fetchTenantBySlug(slug),
    staleTime: 6 * 60 * 60 * 1000, // 6 hours — aligned with JWT TTL
    enabled: !!slug,
  });

  // For core services like Subscriptions, we always use Codevertex branding
  useMemo(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--tenant-primary', DEFAULT_BRAND.primaryColor!);
      document.documentElement.style.setProperty('--tenant-secondary', DEFAULT_BRAND.secondaryColor!);
      document.documentElement.style.setProperty('--tenant-logo-url', `url(${DEFAULT_BRAND.logoUrl})`);
    }
  }, []);

  const effectiveBrand = DEFAULT_BRAND;

  const getServiceTitle = (appName: string) => {
    return `Codevertex ${appName}`;
  };

  const value = useMemo(
    () => ({
      slug,
      tenant: effectiveBrand,
      isLoading,
      error: error as Error | null,
      getServiceTitle,
    }),
    [slug, effectiveBrand, isLoading, error]
  );

  return (
    <TenantBrandingContext.Provider value={value}>
      {children}
    </TenantBrandingContext.Provider>
  );
}

export function useTenantBranding() {
  const context = useContext(TenantBrandingContext);
  if (context === undefined) {
    return {
      slug: '',
      tenant: null,
      isLoading: false,
      error: null,
      getServiceTitle: (s: string) => s,
    };
  }
  return context;
}

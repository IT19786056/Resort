import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface TenantConfig {
  tenant: string | null;
  hotelId: string | null;
  name: string | null;
  logoUrl: string | null;
  markLogoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  phone: string | null;
  email: string | null;
  emailFrom: string | null;
  bankDetails: Record<string, string> | null;
}

// Fallback values used when no tenant is configured (demo / single-hotel mode).
export const BRAND_DEFAULTS = {
  name: 'Amadiya Leisure',
  logoUrl: '/amadiya-logo.png',
  markLogoUrl: '/amadiya-mark.png',
};

const DEFAULT_CONFIG: TenantConfig = {
  tenant: null, hotelId: null, name: null, logoUrl: null, markLogoUrl: null,
  primaryColor: null, accentColor: null, phone: null, email: null,
  emailFrom: null, bankDetails: null,
};

const TenantContext = createContext<TenantConfig>(DEFAULT_CONFIG);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((data: TenantConfig) => {
        setConfig(data);
        // Inject per-tenant color overrides as CSS variables at runtime so the
        // entire Tailwind theme shifts without a rebuild.
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--color-natural-primary', data.primaryColor);
        }
        if (data.accentColor) {
          document.documentElement.style.setProperty('--color-natural-accent', data.accentColor);
        }
      })
      .catch(() => {});
  }, []);

  return <TenantContext.Provider value={config}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}

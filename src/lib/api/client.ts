import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pricingapi.codevertexafrica.com';

/** Per-request options. `signal` aborts the request when a newer search replaces it. */
export interface RequestOptions {
  signal?: AbortSignal;
}

class ApiClient {
  private instance: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: apiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    this.instance.interceptors.request.use(this.handleRequest);
    this.instance.interceptors.response.use(this.handleResponse, this.handleError);
  }

    private handleRequest = (config: InternalAxiosRequestConfig) => {
    if (this.accessToken) {
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    }

    // Tenant Identification Headers
    const tenantId = localStorage.getItem('tenant_id');
    const tenantSlug = localStorage.getItem('tenant_slug');
    const isPlatformOwner = localStorage.getItem('is_platform_owner') === 'true';

    if (isPlatformOwner) {
      // Platform owners: inject selected tenant context if one is chosen in the filter,
      // otherwise omit headers so the backend treats the request as platform-wide.
      try {
        const { useTenantFilterStore } = require('@/store/tenant-filter');
        const selected = useTenantFilterStore.getState().selectedTenant;
        if (selected) {
          config.headers['X-Tenant-ID'] = selected.id;
          config.headers['X-Tenant-Slug'] = selected.slug;
        }
      } catch {
        // store not available during SSR — skip
      }
    } else {
      // Regular tenants: always inject their own tenant context
      if (tenantId) config.headers['X-Tenant-ID'] = tenantId;
      if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug;
    }

    return config;
  };

  private handleResponse = (response: AxiosResponse) => response;

  private on401Callback: (() => void) | null = null;
  private onSubscription403Callback: ((data: any) => void) | null = null;

  /** Register a callback to run when any API response is 401 (e.g. clear session / redirect to auth). */
  public setOn401(callback: (() => void) | null) {
    this.on401Callback = callback;
  }

  /** Register a callback for subscription-related 403 errors (code=subscription_inactive, upgrade=true). */
  public setOnSubscription403(callback: ((data: any) => void) | null) {
    this.onSubscription403Callback = callback;
  }

  private handleError = async (error: any) => {
    if (error.response?.status === 401) {
      // If token is already cleared (explicit logout in progress), skip entirely
      if (!this.accessToken) return Promise.reject(error);

      const url: string = error.config?.url ?? '';
      if (!url.includes('/auth/me') && !error.config?._retried) {
        const sent = String(error.config?.headers?.Authorization ?? '').replace(/^Bearer\s+/i, '');
        const { refreshAccessToken } = await import('@/lib/auth/token-refresh');
        const newToken = await refreshAccessToken(sent || this.accessToken);

        if (newToken) {
          this.accessToken = newToken;
          error.config._retried = true;
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return this.instance.request(error.config);
        }

        this.on401Callback?.();
      } else if (error.config?._retried) {
        // Even a freshly renewed token was refused: the session is unusable, so send the person
        // to sign in instead of leaving a page where every save fails.
        this.on401Callback?.();
      }
    }
    if (error.response?.status === 403 && this.onSubscription403Callback) {
      const data = error.response?.data;
      if (data?.code === 'subscription_inactive' || data?.upgrade === true) {
        this.onSubscription403Callback(data);
      }
    }
    return Promise.reject(error);
  };

  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * GET a JSON payload. Pass `opts.signal` (react-query's queryFn signal, or a search
   * callback's signal) so a superseded search is cancelled instead of running to the end.
   */
  public get<T>(url: string, params?: any, opts?: RequestOptions): Promise<T> {
    return this.instance
      .get<T>(url, { params, signal: opts?.signal })
      .then((res: AxiosResponse<T>) => res.data);
  }

  public post<T>(url: string, data?: any): Promise<T> {
    return this.instance.post<T>(url, data).then((res: AxiosResponse<T>) => res.data);
  }

  public put<T>(url: string, data?: any): Promise<T> {
    return this.instance.put<T>(url, data).then((res: AxiosResponse<T>) => res.data);
  }

  public patch<T>(url: string, data?: any): Promise<T> {
    return this.instance.patch<T>(url, data).then((res: AxiosResponse<T>) => res.data);
  }

  public delete<T>(url: string, data?: any): Promise<T> {
    return this.instance.delete<T>(url, { data }).then((res: AxiosResponse<T>) => res.data);
  }

  /** Fetch a binary (e.g. PDF) as a Blob, parsing the filename from Content-Disposition. */
  public async getBlob(url: string, fallbackName = 'download.pdf', params?: any): Promise<{ blob: Blob; fileName: string }> {
    const res = await this.instance.get(url, { params, responseType: 'blob' });
    let fileName = fallbackName;
    const cd = (res.headers?.['content-disposition'] as string | undefined) ?? '';
    const m = /filename="?([^"]+)"?/.exec(cd);
    if (m) fileName = m[1];
    return { blob: res.data as Blob, fileName };
  }
}

export const apiClient = new ApiClient();

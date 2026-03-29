import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pricingapi.codevertexitsolutions.com';

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

    // Only inject headers if not a platform owner
    if (tenantId && !isPlatformOwner) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
    if (tenantSlug && !isPlatformOwner) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
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

  private handleError = (error: any) => {
    if (error.response?.status === 401 && this.on401Callback) {
      this.on401Callback();
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

  public get<T>(url: string, params?: any): Promise<T> {
    return this.instance.get<T>(url, { params }).then((res: AxiosResponse<T>) => res.data);
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

  public delete<T>(url: string): Promise<T> {
    return this.instance.delete<T>(url).then((res: AxiosResponse<T>) => res.data);
  }
}

export const apiClient = new ApiClient();

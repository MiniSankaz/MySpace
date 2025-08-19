// API Client Configuration - Route through API Gateway
const API_BASE_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://127.0.0.1:4110';

export class ApiClient {
  private static instance: ApiClient;
  private token: string | null = null;

  private constructor() {
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-user-id': 'test-user', // For now, use test user
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Portfolio endpoints
  async getPortfolios() {
    const response = await this.request<any>('/api/v1/portfolios');
    return response.data || [];
  }

  async getPortfolio(id: string) {
    const response = await this.request<any>(`/api/v1/portfolios/${id}`);
    return response.data;
  }

  async createPortfolio(data: any) {
    const response = await this.request<any>('/api/v1/portfolios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updatePortfolio(id: string, data: any) {
    const response = await this.request<any>(`/api/v1/portfolios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deletePortfolio(id: string) {
    const response = await this.request<any>(`/api/v1/portfolios/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // Holdings endpoints
  async getHoldings(portfolioId: string) {
    const response = await this.request<any>(`/api/v1/portfolios/${portfolioId}/holdings`);
    return response.data || [];
  }

  async addHolding(portfolioId: string, data: any) {
    const response = await this.request<any>(`/api/v1/portfolios/${portfolioId}/holdings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateHolding(portfolioId: string, holdingId: string, data: any) {
    const response = await this.request<any>(`/api/v1/portfolios/${portfolioId}/holdings/${holdingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteHolding(portfolioId: string, holdingId: string) {
    const response = await this.request<any>(`/api/v1/portfolios/${portfolioId}/holdings/${holdingId}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // Trading endpoints
  async createOrder(data: any) {
    return this.request<any>('/v1/trades/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Transaction endpoints
  async getTransactions(portfolioId: string, params?: {
    limit?: number;
    offset?: number;
    symbol?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const response = await this.request<any>(
      `/api/v1/portfolios/${portfolioId}/transactions${queryParams.toString() ? `?${queryParams}` : ''}`
    );
    return response.data || { transactions: [], total: 0 };
  }

  async createTransaction(portfolioId: string, data: any) {
    const response = await this.request<any>(`/api/v1/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateTransaction(transactionId: string, data: any) {
    const response = await this.request<any>(`/api/v1/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteTransaction(transactionId: string) {
    const response = await this.request<any>(`/api/v1/transactions/${transactionId}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  async exportTransactions(portfolioId: string, format: 'csv' | 'pdf' | 'excel' | 'json', params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams({ format });
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const response = await fetch(
      `${API_BASE_URL}/api/v1/portfolios/${portfolioId}/export/transactions?${queryParams}`,
      {
        headers: {
          'Authorization': this.token ? `Bearer ${this.token}` : '',
          'x-user-id': 'test-user',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request<any>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    this.clearToken();
    return this.request<any>('/v1/auth/logout', {
      method: 'POST',
    });
  }

  async getProfile() {
    return this.request<any>('/v1/auth/profile');
  }
}

export const apiClient = ApiClient.getInstance();
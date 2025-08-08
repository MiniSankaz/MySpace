// API Client utility for handling server-side and client-side requests

function getBaseUrl(): string {
  // Browser environment
  if (typeof window !== "undefined") {
    return "";
  }

  // Server environment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Default for local development
  return `http://localhost:${process.env.PORT || 3100}`;
}

export class ApiClient {
  private static baseUrl = getBaseUrl();

  static async fetch(url: string, options?: RequestInit): Promise<Response> {
    const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      return response;
    } catch (error) {
      console.error(`API request failed: ${fullUrl}`, error);
      throw error;
    }
  }

  static async get(url: string): Promise<Response> {
    return this.fetch(url, { method: "GET" });
  }

  static async post(url: string, data?: any): Promise<Response> {
    return this.fetch(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async put(url: string, data?: any): Promise<Response> {
    return this.fetch(url, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete(url: string): Promise<Response> {
    return this.fetch(url, { method: "DELETE" });
  }
}

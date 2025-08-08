import { PageComponent } from "../types";
import { ApiClient } from "@core/utils/api-client";

interface Page {
  id: string;
  title: string;
  slug: string;
  content?: string;
  components?: PageComponent[];
  status: "draft" | "published" | "archived";
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any; // Allow additional fields from API
}

export class PageService {
  static async getPage(pageId: string): Promise<Page | null> {
    try {
      const response = await ApiClient.get(`/api/admin/pages/${pageId}`);
      if (!response.ok) throw new Error("Failed to fetch page");
      return await response.json();
    } catch (error) {
      console.error("Error fetching page:", error);
      return null;
    }
  }

  static async createPage(data: {
    title: string;
    slug: string;
    components: PageComponent[];
  }): Promise<Page> {
    const response = await ApiClient.post("/api/admin/pages", data);

    if (!response.ok) throw new Error("Failed to create page");
    return await response.json();
  }

  static async updatePage(
    pageId: string,
    data: Partial<{
      title: string;
      slug: string;
      components: PageComponent[];
      status: "draft" | "published";
    }>,
  ): Promise<Page> {
    const response = await ApiClient.put(`/api/admin/pages/${pageId}`, data);

    if (!response.ok) throw new Error("Failed to update page");
    return await response.json();
  }

  static async deletePage(pageId: string): Promise<void> {
    const response = await ApiClient.delete(`/api/admin/pages/${pageId}`);

    if (!response.ok) throw new Error("Failed to delete page");
  }

  static async listPages(params?: {
    status?: "draft" | "published";
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ pages: Page[]; total: number }> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await ApiClient.get(`/api/admin/pages?${searchParams}`);
    if (!response.ok) throw new Error("Failed to fetch pages");
    return await response.json();
  }

  static async publishPage(pageId: string): Promise<Page> {
    return this.updatePage(pageId, { status: "published" });
  }

  static async unpublishPage(pageId: string): Promise<Page> {
    return this.updatePage(pageId, { status: "draft" });
  }

  static async duplicatePage(pageId: string): Promise<Page> {
    const response = await ApiClient.post(
      `/api/admin/pages/${pageId}/duplicate`,
    );

    if (!response.ok) throw new Error("Failed to duplicate page");
    return await response.json();
  }

  static async getPageBySlug(slug: string): Promise<Page | null> {
    try {
      const response = await ApiClient.get(`/api/public/pages/${slug}`);
      if (!response.ok) {
        console.error(
          `Failed to fetch page by slug: ${slug}, Status: ${response.status}, ${response.statusText}`,
        );
        if (response.status === 404) {
          console.warn(`Page with slug "${slug}" not found or not published`);
        }
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching page by slug:", error);
      return null;
    }
  }
}

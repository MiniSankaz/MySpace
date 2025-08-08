import { prisma } from "@core/database";
import { cache } from "react";

export interface Translation {
  id: string;
  key: string;
  namespace: string;
  locale: string;
  value: string;
}

class TranslationService {
  // Cache translations by locale and namespace
  private translationCache = new Map<string, Map<string, string>>();

  // Get all translations for a locale and namespace
  getTranslations = cache(
    async (locale: string, namespace: string = "common") => {
      const cacheKey = `${locale}:${namespace}`;

      // Check cache first
      if (this.translationCache.has(cacheKey)) {
        return this.translationCache.get(cacheKey)!;
      }

      try {
        const translations = await prisma.translation.findMany({
          where: {
            locale,
            namespace,
          },
        });

        // Convert to key-value map
        const translationMap = new Map<string, string>();
        translations.forEach((t) => {
          translationMap.set(t.key, t.value);
        });

        // Cache the result
        this.translationCache.set(cacheKey, translationMap);

        return translationMap;
      } catch (error) {
        console.error("Error fetching translations:", error);
        return new Map<string, string>();
      }
    },
  );

  // Get a single translation
  async getTranslation(
    key: string,
    locale: string,
    namespace: string = "common",
  ): Promise<string | null> {
    try {
      const translation = await prisma.translation.findUnique({
        where: {
          key_locale_namespace: {
            key,
            locale,
            namespace,
          },
        },
      });

      return translation?.value || null;
    } catch (error) {
      console.error("Error fetching translation:", error);
      return null;
    }
  }

  // Create or update a translation
  async upsertTranslation(
    key: string,
    locale: string,
    value: string,
    namespace: string = "common",
  ): Promise<Translation> {
    // Clear cache for this locale and namespace
    const cacheKey = `${locale}:${namespace}`;
    this.translationCache.delete(cacheKey);

    return await prisma.translation.upsert({
      where: {
        key_locale_namespace: {
          key,
          locale,
          namespace,
        },
      },
      update: {
        value,
        updatedAt: new Date(),
      },
      create: {
        key,
        locale,
        value,
        namespace,
      },
    });
  }

  // Bulk create or update translations
  async bulkUpsertTranslations(
    translations: Array<{
      key: string;
      locale: string;
      value: string;
      namespace?: string;
    }>,
  ): Promise<void> {
    // Clear cache for affected locales
    const affectedCacheKeys = new Set<string>();
    translations.forEach((t) => {
      const cacheKey = `${t.locale}:${t.namespace || "common"}`;
      affectedCacheKeys.add(cacheKey);
    });
    affectedCacheKeys.forEach((key) => this.translationCache.delete(key));

    // Use transactions for bulk operations
    await prisma.$transaction(
      translations.map((t) =>
        prisma.translation.upsert({
          where: {
            key_locale_namespace: {
              key: t.key,
              locale: t.locale,
              namespace: t.namespace || "common",
            },
          },
          update: {
            value: t.value,
            updatedAt: new Date(),
          },
          create: {
            key: t.key,
            locale: t.locale,
            value: t.value,
            namespace: t.namespace || "common",
          },
        }),
      ),
    );
  }

  // Delete a translation
  async deleteTranslation(id: string): Promise<void> {
    const translation = await prisma.translation.findUnique({
      where: { id },
    });

    if (translation) {
      // Clear cache
      const cacheKey = `${translation.locale}:${translation.namespace}`;
      this.translationCache.delete(cacheKey);

      await prisma.translation.delete({
        where: { id },
      });
    }
  }

  // Get all unique namespaces
  async getNamespaces(): Promise<string[]> {
    const result = await prisma.translation.findMany({
      select: {
        namespace: true,
      },
      distinct: ["namespace"],
    });

    return result.map((r) => r.namespace);
  }

  // Get all translations for management
  async getAllTranslations(filters?: {
    locale?: string;
    namespace?: string;
    search?: string;
  }): Promise<Translation[]> {
    const where: any = {};

    if (filters?.locale) {
      where.locale = filters.locale;
    }

    if (filters?.namespace) {
      where.namespace = filters.namespace;
    }

    if (filters?.search) {
      where.OR = [
        { key: { contains: filters.search, mode: "insensitive" } },
        { value: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return await prisma.translation.findMany({
      where,
      orderBy: [{ namespace: "asc" }, { key: "asc" }, { locale: "asc" }],
    });
  }

  // Clear all cache
  clearCache(): void {
    this.translationCache.clear();
  }

  // Import translations from JSON files (migration helper)
  async importFromFiles(
    translations: Record<string, any>,
    locale: string,
  ): Promise<void> {
    const flatTranslations: Array<{
      key: string;
      locale: string;
      value: string;
      namespace: string;
    }> = [];

    // Flatten nested translations
    const flatten = (obj: any, prefix = "", namespace = "common") => {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === "string") {
          flatTranslations.push({
            key: fullKey,
            locale,
            value,
            namespace,
          });
        } else if (typeof value === "object" && value !== null) {
          flatten(value, fullKey, namespace);
        }
      });
    };

    flatten(translations);

    // Bulk insert
    await this.bulkUpsertTranslations(flatTranslations);
  }
}

export const translationService = new TranslationService();

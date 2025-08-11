import { prisma } from '@/core/database/prisma';
import { CacheManager } from '@/core/database/cache-manager';
import { logger } from '@/core/utils/logger';
import type { 
  CreateIssueDto, 
  UpdateIssueDto, 
  SearchParams,
  IssueWithRelations 
} from '../types';

export class IssueService {
  private cache: CacheManager;
  private readonly CACHE_PREFIX = 'kb:issue:';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cache = CacheManager.getInstance();
  }

  async create(data: CreateIssueDto, userId: string): Promise<IssueWithRelations> {
    try {
      const { tags, ...issueData } = data;

      const issue = await prisma.kBIssue.create({
        data: {
          ...issueData,
          createdBy: userId,
          Tags: tags ? {
            create: await this.prepareTags(tags)
          } : undefined
        },
        include: this.getIncludeOptions()
      });

      // Invalidate cache
      await this.cache.delete(`${this.CACHE_PREFIX}list`);
      
      // Index for search
      await this.indexIssue(issue);

      logger.info('Issue created', { issueId: issue.id, userId });
      return issue as IssueWithRelations;
    } catch (error) {
      logger.error('Failed to create issue', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateIssueDto, userId: string): Promise<IssueWithRelations> {
    try {
      const { tags, ...updateData } = data;

      // Check if issue is being resolved
      const resolvedAt = data.status === 'resolved' ? new Date() : undefined;

      const issue = await prisma.kBIssue.update({
        where: { id },
        data: {
          ...updateData,
          resolvedAt,
          Tags: tags ? {
            deleteMany: {},
            create: await this.prepareTags(tags)
          } : undefined
        },
        include: this.getIncludeOptions()
      });

      // Clear cache
      await this.cache.delete(`${this.CACHE_PREFIX}${id}`);
      await this.cache.delete(`${this.CACHE_PREFIX}list`);

      // Re-index for search
      await this.indexIssue(issue);

      logger.info('Issue updated', { issueId: id, userId });
      return issue as IssueWithRelations;
    } catch (error) {
      logger.error('Failed to update issue', error);
      throw error;
    }
  }

  async findById(id: string): Promise<IssueWithRelations | null> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;
    
    // Check cache
    const cached = await this.cache.get<IssueWithRelations>(cacheKey);
    if (cached) return cached;

    try {
      const issue = await prisma.kBIssue.findUnique({
        where: { id },
        include: this.getIncludeOptions()
      });

      if (issue) {
        await this.cache.set(cacheKey, issue, this.CACHE_TTL);
      }

      return issue as IssueWithRelations | null;
    } catch (error) {
      logger.error('Failed to find issue', error);
      throw error;
    }
  }

  async search(params: SearchParams): Promise<{
    items: IssueWithRelations[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      query,
      status,
      severity,
      categoryId,
      assignedTo,
      createdBy,
      tags,
      fromDate,
      toDate,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const where: any = {};

    // Build search conditions
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { errorMessage: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (categoryId) where.categoryId = categoryId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (createdBy) where.createdBy = createdBy;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    if (tags && tags.length > 0) {
      where.Tags = {
        some: {
          Tag: {
            name: { in: tags }
          }
        }
      };
    }

    try {
      const [items, total] = await Promise.all([
        prisma.kBIssue.findMany({
          where,
          include: this.getIncludeOptions(),
          skip: offset,
          take: limit,
          orderBy: { [sortBy]: sortOrder }
        }),
        prisma.kBIssue.count({ where })
      ]);

      return {
        items: items as IssueWithRelations[],
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit
      };
    } catch (error) {
      logger.error('Failed to search issues', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.kBIssue.delete({
        where: { id }
      });

      // Clear cache
      await this.cache.delete(`${this.CACHE_PREFIX}${id}`);
      await this.cache.delete(`${this.CACHE_PREFIX}list`);

      logger.info('Issue deleted', { issueId: id });
    } catch (error) {
      logger.error('Failed to delete issue', error);
      throw error;
    }
  }

  private async prepareTags(tagNames: string[]) {
    const tags = await Promise.all(
      tagNames.map(async (name) => {
        let tag = await prisma.kBTag.findUnique({ where: { name } });
        
        if (!tag) {
          tag = await prisma.kBTag.create({
            data: { name }
          });
        }
        
        return { tagId: tag.id };
      })
    );
    
    return tags;
  }

  private async indexIssue(issue: any): Promise<void> {
    try {
      const searchText = `${issue.title} ${issue.description} ${issue.errorMessage || ''}`;
      
      await prisma.kBSearchIndex.upsert({
        where: {
          issueId: issue.id
        },
        create: {
          issueId: issue.id,
          contentText: searchText
        },
        update: {
          contentText: searchText,
          lastIndexed: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to index issue', error);
    }
  }

  private getIncludeOptions() {
    return {
      Category: true,
      Creator: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      },
      Assignee: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      },
      Solutions: {
        select: {
          id: true,
          title: true,
          effectivenessScore: true,
          verified: true
        }
      },
      Tags: {
        include: {
          Tag: true
        }
      }
    };
  }
}
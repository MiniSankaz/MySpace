# Knowledge Base System - Phase 1 Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing Phase 1 of the Knowledge Base System, focusing on foundation components: Database, CRUD operations, Basic Search, and UI.

## Prerequisites
- Node.js 18+ installed
- PostgreSQL database access
- Existing Stock Portfolio Management System running
- Admin access (sankaz@admin.com)

## Sprint 1: Database & Core Services (Weeks 1-2)

### Day 1-2: Database Setup

#### Step 1: Update Prisma Schema
Add the following models to `/prisma/schema.prisma`:

```prisma
// Add after existing models

model KnowledgeBaseIssue {
  id              String                    @id @default(uuid())
  title           String
  description     String
  errorMessage    String?
  stackTrace      String?
  environment     String
  severity        String                    @default("medium")
  status          String                    @default("open")
  categoryId      String?
  projectId       String?
  userId          String
  occurredAt      DateTime
  resolvedAt      DateTime?
  metadata        Json?
  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt
  
  User            User                      @relation(fields: [userId], references: [id])
  Category        KnowledgeBaseCategory?    @relation(fields: [categoryId], references: [id])
  Project         Project?                  @relation(fields: [projectId], references: [id])
  Solutions       KnowledgeBaseSolution[]
  Tags            KnowledgeBaseIssueTag[]
  Attachments     KnowledgeBaseAttachment[]
  
  @@index([userId])
  @@index([categoryId])
  @@index([projectId])
  @@index([status])
  @@index([severity])
  @@index([occurredAt])
}

// Add remaining models from development plan...
```

#### Step 2: Run Database Migration
```bash
# Generate migration
npx prisma migrate dev --name add-knowledge-base-models

# Generate Prisma client
npx prisma generate

# Verify migration
npx prisma studio
```

### Day 3-4: Core Service Implementation

#### Step 1: Create Module Structure
```bash
# Create module directories
mkdir -p src/modules/knowledge-base/{components,services,hooks,stores,types,utils,tests}
mkdir -p src/modules/knowledge-base/components/{issues,solutions,search,categories,tags,layout}
```

#### Step 2: Implement Issue Service
Create `/src/modules/knowledge-base/services/issue.service.ts`:

```typescript
import { prisma } from '@/core/database/prisma';
import { CacheManager } from '@/core/database/cache-manager';
import type { 
  KnowledgeBaseIssue, 
  CreateIssueDto, 
  UpdateIssueDto 
} from '../types/issue.types';

export class IssueService {
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager();
  }

  async createIssue(
    data: CreateIssueDto, 
    userId: string
  ): Promise<KnowledgeBaseIssue> {
    // Validation
    if (!data.title || data.title.length < 5) {
      throw new Error('Title must be at least 5 characters');
    }

    // Create issue
    const issue = await prisma.knowledgeBaseIssue.create({
      data: {
        ...data,
        userId,
        occurredAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        Category: true,
        Tags: {
          include: {
            Tag: true,
          },
        },
      },
    });

    // Clear cache
    await this.cache.delete('kb:issues:*');

    return issue;
  }

  async findIssues(
    filters: any = {}, 
    pagination: any = {}
  ): Promise<any> {
    const {
      page = 1,
      pageSize = 20,
      orderBy = { createdAt: 'desc' },
    } = pagination;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where = this.buildWhereClause(filters);

    // Execute query
    const [items, total] = await Promise.all([
      prisma.knowledgeBaseIssue.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
            },
          },
          Category: true,
          Solutions: {
            where: { status: 'verified' },
            take: 1,
          },
          _count: {
            select: {
              Solutions: true,
              Tags: true,
            },
          },
        },
        skip,
        take,
        orderBy,
      }),
      prisma.knowledgeBaseIssue.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getIssueById(id: string): Promise<KnowledgeBaseIssue | null> {
    // Check cache
    const cacheKey = `kb:issue:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const issue = await prisma.knowledgeBaseIssue.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        Category: true,
        Tags: {
          include: {
            Tag: true,
          },
        },
        Solutions: {
          include: {
            User: {
              select: {
                id: true,
                displayName: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        Attachments: true,
      },
    });

    if (issue) {
      await this.cache.set(cacheKey, issue, 300); // 5 minutes
    }

    return issue;
  }

  async updateIssue(
    id: string, 
    data: UpdateIssueDto
  ): Promise<KnowledgeBaseIssue> {
    const issue = await prisma.knowledgeBaseIssue.update({
      where: { id },
      data,
      include: {
        User: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        Category: true,
      },
    });

    // Clear cache
    await this.cache.delete(`kb:issue:${id}`);
    await this.cache.delete('kb:issues:*');

    return issue;
  }

  async deleteIssue(id: string): Promise<void> {
    await prisma.knowledgeBaseIssue.delete({
      where: { id },
    });

    // Clear cache
    await this.cache.delete(`kb:issue:${id}`);
    await this.cache.delete('kb:issues:*');
  }

  async resolveIssue(
    id: string, 
    solutionId?: string
  ): Promise<void> {
    await prisma.knowledgeBaseIssue.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        metadata: {
          resolvedWithSolution: solutionId,
        },
      },
    });

    // Clear cache
    await this.cache.delete(`kb:issue:${id}`);
    await this.cache.delete('kb:issues:*');
  }

  private buildWhereClause(filters: any): any {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.occurredAt = {};
      if (filters.dateFrom) {
        where.occurredAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.occurredAt.lte = new Date(filters.dateTo);
      }
    }

    return where;
  }
}

export const issueService = new IssueService();
```

### Day 5-6: API Endpoints

#### Step 1: Create API Routes
Create `/src/app/api/knowledge-base/issues/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { issueService } from '@/modules/knowledge-base/services/issue.service';
import { z } from 'zod';

// Validation schema
const createIssueSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
  environment: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  categoryId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/knowledge-base/issues
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status'),
      severity: searchParams.get('severity'),
      categoryId: searchParams.get('categoryId'),
      userId: searchParams.get('userId'),
      search: searchParams.get('search'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    };

    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    };

    const result = await issueService.findIssues(filters, pagination);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge-base/issues
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = createIssueSchema.parse(body);

    // Create issue
    const issue = await issueService.createIssue(
      validatedData,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: issue,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Failed to create issue' },
      { status: 500 }
    );
  }
}
```

### Day 7-8: Testing Setup

#### Step 1: Unit Tests
Create `/src/modules/knowledge-base/tests/services/issue.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IssueService } from '../../services/issue.service';
import { prisma } from '@/core/database/prisma';

// Mock Prisma
jest.mock('@/core/database/prisma', () => ({
  prisma: {
    knowledgeBaseIssue: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('IssueService', () => {
  let service: IssueService;

  beforeEach(() => {
    service = new IssueService();
    jest.clearAllMocks();
  });

  describe('createIssue', () => {
    it('should create issue with valid data', async () => {
      const mockIssue = {
        id: 'test-id',
        title: 'Test Issue',
        description: 'Test description',
        severity: 'medium',
        status: 'open',
        userId: 'user-id',
        occurredAt: new Date(),
      };

      (prisma.knowledgeBaseIssue.create as jest.Mock).mockResolvedValue(mockIssue);

      const data = {
        title: 'Test Issue',
        description: 'Test description',
        severity: 'medium',
        environment: 'production',
      };

      const result = await service.createIssue(data, 'user-id');

      expect(result).toEqual(mockIssue);
      expect(prisma.knowledgeBaseIssue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: data.title,
            description: data.description,
            severity: data.severity,
            userId: 'user-id',
          }),
        })
      );
    });

    it('should throw error for invalid title', async () => {
      const data = {
        title: 'Bad',
        description: 'Test description',
        severity: 'medium',
        environment: 'production',
      };

      await expect(service.createIssue(data, 'user-id'))
        .rejects.toThrow('Title must be at least 5 characters');
    });
  });

  describe('findIssues', () => {
    it('should return paginated issues', async () => {
      const mockIssues = [
        { id: '1', title: 'Issue 1' },
        { id: '2', title: 'Issue 2' },
      ];

      (prisma.knowledgeBaseIssue.findMany as jest.Mock).mockResolvedValue(mockIssues);
      (prisma.knowledgeBaseIssue.count as jest.Mock).mockResolvedValue(10);

      const result = await service.findIssues({}, { page: 1, pageSize: 20 });

      expect(result).toEqual({
        items: mockIssues,
        total: 10,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });
  });
});
```

## Sprint 2: UI Components & Basic Features (Weeks 3-4)

### Day 9-10: Issue Management UI

#### Step 1: Create Issue List Component
Create `/src/modules/knowledge-base/components/issues/IssueList.tsx`:

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useIssues } from '../../hooks/useIssues';
import { IssueCard } from './IssueCard';
import { IssueFilters } from './IssueFilters';
import { Plus, Search } from 'lucide-react';

export const IssueList: React.FC = () => {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const { issues, loading, error, refetch } = useIssues(filters, page);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          Error loading issues: {error.message}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Knowledge Base Issues</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Issue
        </Button>
      </div>

      {/* Filters */}
      <IssueFilters onFilterChange={setFilters} />

      {/* Issues Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {issues?.items?.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>

      {/* Pagination */}
      {issues?.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="py-2 px-4">
            Page {page} of {issues.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= issues.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
```

#### Step 2: Create Issue Card Component
Create `/src/modules/knowledge-base/components/issues/IssueCard.tsx`:

```typescript
'use client';

import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  MessageSquare, 
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface IssueCardProps {
  issue: any;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Link href={`/knowledge-base/issues/${issue.id}`}>
              <h3 className="font-semibold hover:text-primary cursor-pointer">
                {issue.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getSeverityColor(issue.severity)}>
                {issue.severity}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {getStatusIcon(issue.status)}
                {issue.status}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {issue.description}
        </p>

        {issue.Category && (
          <Badge variant="outline" className="mt-2">
            {issue.Category.name}
          </Badge>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {issue.User?.displayName || 'Unknown'}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {issue._count?.Solutions || 0}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
```

### Day 11-12: Solution Management

#### Step 1: Create Solution Service
Create `/src/modules/knowledge-base/services/solution.service.ts`:

```typescript
import { prisma } from '@/core/database/prisma';
import { CacheManager } from '@/core/database/cache-manager';
import type { 
  KnowledgeBaseSolution, 
  CreateSolutionDto, 
  UpdateSolutionDto 
} from '../types/solution.types';

export class SolutionService {
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager();
  }

  async createSolution(
    data: CreateSolutionDto, 
    userId: string
  ): Promise<KnowledgeBaseSolution> {
    const solution = await prisma.knowledgeBaseSolution.create({
      data: {
        ...data,
        userId,
      },
      include: {
        User: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    // Clear cache
    await this.cache.delete(`kb:issue:${data.issueId}`);
    await this.cache.delete('kb:solutions:*');

    return solution;
  }

  async findSolutionsByIssue(issueId: string): Promise<KnowledgeBaseSolution[]> {
    const cacheKey = `kb:solutions:issue:${issueId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const solutions = await prisma.knowledgeBaseSolution.findMany({
      where: { issueId },
      include: {
        User: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        Feedback: {
          include: {
            User: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    await this.cache.set(cacheKey, solutions, 300);
    return solutions;
  }

  async verifySolution(solutionId: string): Promise<void> {
    await prisma.knowledgeBaseSolution.update({
      where: { id: solutionId },
      data: {
        status: 'verified',
        verifiedAt: new Date(),
      },
    });

    // Clear cache
    await this.cache.delete('kb:solutions:*');
  }

  async addFeedback(
    solutionId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    await prisma.knowledgeBaseSolutionFeedback.upsert({
      where: {
        solutionId_userId: {
          solutionId,
          userId,
        },
      },
      update: {
        rating,
        comment,
        helpful: rating >= 3,
      },
      create: {
        solutionId,
        userId,
        rating,
        comment,
        helpful: rating >= 3,
      },
    });

    // Clear cache
    await this.cache.delete(`kb:solutions:*`);
  }
}

export const solutionService = new SolutionService();
```

### Day 13-14: Search Implementation

#### Step 1: Create Search Service
Create `/src/modules/knowledge-base/services/search.service.ts`:

```typescript
import { prisma } from '@/core/database/prisma';
import { CacheManager } from '@/core/database/cache-manager';

export class SearchService {
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager();
  }

  async search(query: string, options: any = {}): Promise<any> {
    const {
      type = 'all',
      limit = 20,
      offset = 0,
    } = options;

    const cacheKey = `kb:search:${JSON.stringify({ query, type, limit, offset })}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const results = {
      issues: [],
      solutions: [],
      total: 0,
    };

    // Search issues
    if (type === 'all' || type === 'issues') {
      const issues = await prisma.knowledgeBaseIssue.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { errorMessage: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          User: {
            select: {
              id: true,
              displayName: true,
            },
          },
          Category: true,
        },
        take: limit,
        skip: offset,
      });
      results.issues = issues;
    }

    // Search solutions
    if (type === 'all' || type === 'solutions') {
      const solutions = await prisma.knowledgeBaseSolution.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          User: {
            select: {
              id: true,
              displayName: true,
            },
          },
          Issue: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        take: limit,
        skip: offset,
      });
      results.solutions = solutions;
    }

    results.total = results.issues.length + results.solutions.length;

    await this.cache.set(cacheKey, results, 60); // 1 minute cache
    return results;
  }

  async getSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) return [];

    const cacheKey = `kb:suggestions:${query}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Get unique titles that match the query
    const issues = await prisma.knowledgeBaseIssue.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        title: true,
      },
      take: 5,
    });

    const suggestions = issues.map(i => i.title);
    
    await this.cache.set(cacheKey, suggestions, 300);
    return suggestions;
  }

  async indexIssue(issue: any): Promise<void> {
    // This will be expanded in Phase 3 for semantic search
    // For now, we rely on PostgreSQL full-text search
    
    const searchContent = [
      issue.title,
      issue.description,
      issue.errorMessage,
      issue.Category?.name,
    ].filter(Boolean).join(' ');

    await prisma.knowledgeBaseSearchIndex.upsert({
      where: {
        entityType_entityId: {
          entityType: 'issue',
          entityId: issue.id,
        },
      },
      update: {
        content: searchContent,
        metadata: {
          title: issue.title,
          severity: issue.severity,
          status: issue.status,
        },
      },
      create: {
        entityType: 'issue',
        entityId: issue.id,
        content: searchContent,
        vector: [], // Will be populated in Phase 3
        metadata: {
          title: issue.title,
          severity: issue.severity,
          status: issue.status,
        },
      },
    });
  }

  async findSimilar(issue: any, options: any = {}): Promise<any[]> {
    const {
      threshold = 0.8,
      limit = 5,
    } = options;

    // Basic similarity search using title and description
    // This will be enhanced with vector similarity in Phase 3
    
    const keywords = issue.title.split(' ')
      .filter((word: string) => word.length > 3)
      .slice(0, 5);

    if (keywords.length === 0) return [];

    const similar = await prisma.knowledgeBaseIssue.findMany({
      where: {
        AND: [
          { id: { not: issue.id } },
          {
            OR: keywords.map((keyword: string) => ({
              OR: [
                { title: { contains: keyword, mode: 'insensitive' } },
                { description: { contains: keyword, mode: 'insensitive' } },
              ],
            })),
          },
        ],
      },
      take: limit,
    });

    return similar;
  }
}

export const searchService = new SearchService();
```

## Sprint 3: Integration & Testing (Weeks 5-6)

### Day 15-16: Integration with Existing Systems

#### Step 1: Add Knowledge Base to Navigation
Update existing navigation to include Knowledge Base link.

#### Step 2: Create Knowledge Base Layout
Create `/src/app/(auth)/knowledge-base/layout.tsx`:

```typescript
import { KnowledgeBaseLayout } from '@/modules/knowledge-base/components/layout/KnowledgeBaseLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <KnowledgeBaseLayout>{children}</KnowledgeBaseLayout>;
}
```

#### Step 3: Create Main Page
Create `/src/app/(auth)/knowledge-base/page.tsx`:

```typescript
import { IssueList } from '@/modules/knowledge-base/components/issues/IssueList';

export default function KnowledgeBasePage() {
  return <IssueList />;
}
```

### Day 17-18: Performance Optimization

#### Step 1: Add Database Indexes
Add to Prisma schema:

```prisma
@@index([title, description])
@@fulltext([title, description, errorMessage])
```

#### Step 2: Implement Request Caching
Update services to use aggressive caching for read operations.

### Day 19-20: Final Testing & Documentation

#### Step 1: Run All Tests
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

#### Step 2: Performance Testing
```bash
# Use Apache Bench or similar
ab -n 1000 -c 10 http://localhost:4000/api/knowledge-base/issues
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] CLAUDE.md updated
- [ ] Performance benchmarks met

### Deployment
```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup.sql

# 2. Run migrations
npx prisma migrate deploy

# 3. Build application
npm run build

# 4. Deploy
npm run deploy
```

### Post-Deployment
- [ ] Verify all endpoints working
- [ ] Check performance metrics
- [ ] Monitor error rates
- [ ] Verify cache functioning
- [ ] Test user flows

## Troubleshooting Guide

### Common Issues

#### Database Migration Fails
```bash
# Reset and retry
npx prisma migrate reset
npx prisma migrate dev
```

#### Cache Not Working
```bash
# Check Redis connection
redis-cli ping

# Clear cache
redis-cli FLUSHDB
```

#### Search Not Finding Results
- Check database indexes exist
- Verify full-text search configuration
- Check search query format

#### Performance Issues
- Enable query logging
- Check slow queries
- Verify indexes are being used
- Check cache hit rates

## Success Criteria

### Functional Requirements
- [ ] Users can create, read, update, delete issues
- [ ] Users can add solutions to issues
- [ ] Search returns relevant results
- [ ] Categories and tags working
- [ ] User authentication integrated

### Performance Requirements
- [ ] API response time < 500ms
- [ ] Page load time < 3 seconds
- [ ] Search results < 1 second
- [ ] Cache hit rate > 80%

### Quality Requirements
- [ ] Test coverage > 80%
- [ ] No critical security issues
- [ ] Documentation complete
- [ ] Error handling comprehensive

## Next Phase Preview

### Phase 2: Claude Integration
- Auto-capture issues from conversations
- AI-powered solution suggestions
- Pattern recognition
- SOP generation

### Getting Ready for Phase 2
1. Collect sample data for training
2. Set up Claude API enhanced features
3. Design pattern recognition algorithms
4. Plan SOP template structure

---

*End of Phase 1 Implementation Guide*
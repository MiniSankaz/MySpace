export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";
export type IssueStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  | "reopened";
export type RelationshipType =
  | "duplicate"
  | "related"
  | "depends_on"
  | "blocks"
  | "caused_by";

export interface CreateIssueDto {
  title: string;
  description: string;
  errorMessage?: string;
  stackTrace?: string;
  severity?: IssueSeverity;
  categoryId?: string;
  environment?: string;
  affectedComponents?: string[];
  reproductionSteps?: string;
  businessImpact?: string;
  tags?: string[];
}

export interface UpdateIssueDto extends Partial<CreateIssueDto> {
  status?: IssueStatus;
  assignedTo?: string;
}

export interface CreateSolutionDto {
  issueId: string;
  title: string;
  description: string;
  codeSnippet?: string;
  rootCause?: string;
  preventionSteps?: string;
}

export interface UpdateSolutionDto
  extends Partial<Omit<CreateSolutionDto, "issueId">> {
  verified?: boolean;
}

export interface SolutionFeedbackDto {
  solutionId: string;
  rating: number;
  comment?: string;
  resolvedIssue: boolean;
  timeToResolve?: number;
}

export interface SearchParams {
  query?: string;
  status?: IssueStatus;
  severity?: IssueSeverity;
  categoryId?: string;
  assignedTo?: string;
  createdBy?: string;
  tags?: string[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "updatedAt" | "severity" | "status";
  sortOrder?: "asc" | "desc";
}

export interface IssueWithRelations {
  id: string;
  title: string;
  description: string;
  errorMessage?: string | null;
  stackTrace?: string | null;
  severity: string;
  status: string;
  categoryId?: string | null;
  environment?: string | null;
  affectedComponents: string[];
  reproductionSteps?: string | null;
  businessImpact?: string | null;
  createdBy: string;
  assignedTo?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  Category?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  Creator: {
    id: string;
    email: string;
    displayName?: string | null;
  };
  Assignee?: {
    id: string;
    email: string;
    displayName?: string | null;
  } | null;
  Solutions?: Array<{
    id: string;
    title: string;
    effectivenessScore: number;
    verified: boolean;
  }>;
  Tags?: Array<{
    Tag: {
      id: string;
      name: string;
      color?: string | null;
    };
  }>;
}

export interface PatternAnalysis {
  pattern: string;
  frequency: number;
  relatedIssues: string[];
  suggestedSolutions: string[];
  averageResolutionTime?: number;
  successRate?: number;
}

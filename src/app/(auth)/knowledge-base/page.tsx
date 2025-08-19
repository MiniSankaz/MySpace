"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Tabs, { TabContent, TabList, TabTrigger } from "@/components/ui/Tabs";
import { SearchBar } from "@/modules/knowledge-base/components/SearchBar";
import { IssueCard } from "@/modules/knowledge-base/components/IssueCard";
import toast from "react-hot-toast";
import type { IssueWithRelations } from "@/modules/knowledge-base/types";

export default function KnowledgeBasePage() {
  const [issues, setIssues] = useState<IssueWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    resolved: 0,
    critical: 0,
  });

  useEffect(() => {
    fetchIssues();
    fetchStats();
  }, [searchParams]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams as any);
      const response = await fetch(`/api/knowledge-base/issues?${params}`);

      if (!response.ok) throw new Error("Failed to fetch issues");

      const data = await response.json();
      setIssues(data.items || []);
    } catch (error) {
      toast.error("Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/knowledge-base/analytics/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleSearch = (params: any) => {
    setSearchParams(params);
  };

  const handleIssueClick = (issue: IssueWithRelations) => {
    // Navigate to issue detail page
    window.location.href = `/knowledge-base/issues/${issue.id}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Track, resolve, and learn from development issues
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Report Issue
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Pending resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Successfully fixed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.critical}
            </div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <SearchBar onSearch={handleSearch} />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabList className="grid w-full grid-cols-5">
              <TabTrigger value="all">All Issues</TabTrigger>
              <TabTrigger value="recent">Recent</TabTrigger>
              <TabTrigger value="my-issues">My Issues</TabTrigger>
              <TabTrigger value="unresolved">Unresolved</TabTrigger>
              <TabTrigger value="patterns">Patterns</TabTrigger>
            </TabList>

            <TabContent value="all" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-2 text-muted-foreground">
                    Loading issues...
                  </p>
                </div>
              ) : issues.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-medium">No issues found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting your search filters or create a new issue.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {issues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onClick={() => handleIssueClick(issue)}
                      showActions
                    />
                  ))}
                </div>
              )}
            </TabContent>

            <TabContent value="recent">
              <div className="text-center py-8 text-muted-foreground">
                Recent issues will appear here
              </div>
            </TabContent>

            <TabContent value="my-issues">
              <div className="text-center py-8 text-muted-foreground">
                Your reported and assigned issues
              </div>
            </TabContent>

            <TabContent value="unresolved">
              <div className="text-center py-8 text-muted-foreground">
                Open issues without solutions
              </div>
            </TabContent>

            <TabContent value="patterns">
              <Card>
                <CardHeader>
                  <CardTitle>Common Patterns</CardTitle>
                  <CardDescription>
                    Recurring issues and their frequency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">TypeScript Errors</p>
                        <p className="text-sm text-muted-foreground">
                          15 occurrences this week
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">
                          Database Connection Issues
                        </p>
                        <p className="text-sm text-muted-foreground">
                          8 occurrences this week
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Build Failures</p>
                        <p className="text-sm text-muted-foreground">
                          5 occurrences this week
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

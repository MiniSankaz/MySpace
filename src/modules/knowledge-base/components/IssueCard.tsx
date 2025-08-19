"use client";

import React from "react";
import {
  Calendar,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  User,
} from "lucide-react";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { IssueWithRelations } from "../types";

interface IssueCardProps {
  issue: IssueWithRelations;
  onClick?: () => void;
  showActions?: boolean;
}

export function IssueCard({
  issue,
  onClick,
  showActions = false,
}: IssueCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "reopened":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
      case "closed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        onClick ? "hover:bg-gray-50" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {issue.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {issue.description}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Badge className={`${getSeverityColor(issue.severity)} text-xs`}>
              {issue.severity}
            </Badge>
            <Badge
              className={`${getStatusColor(issue.status)} text-xs flex items-center gap-1`}
            >
              {getStatusIcon(issue.status)}
              {issue.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {issue.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800 font-mono">
              {issue.errorMessage.length > 150
                ? `${issue.errorMessage.substring(0, 150)}...`
                : issue.errorMessage}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>{issue.Creator.displayName || issue.Creator.email}</span>
            </div>

            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(issue.createdAt)}</span>
            </div>

            {issue.Solutions && issue.Solutions.length > 0 && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>
                  {issue.Solutions.length} solution
                  {issue.Solutions.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {issue.Category && (
            <Badge variant="outline" className="text-xs">
              <Tag className="w-3 h-3 mr-1" />
              {issue.Category.name}
            </Badge>
          )}
        </div>

        {issue.Tags && issue.Tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {issue.Tags.slice(0, 3).map((tagRelation) => (
              <Badge
                key={tagRelation.Tag.id}
                variant="secondary"
                className="text-xs"
              >
                {tagRelation.Tag.name}
              </Badge>
            ))}
            {issue.Tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{issue.Tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {showActions && (
          <div className="flex justify-end space-x-2 mt-4 pt-3 border-t">
            <Button size="sm" variant="outline">
              View Details
            </Button>
            {issue.status !== "resolved" && issue.status !== "closed" && (
              <Button size="sm">Add Solution</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

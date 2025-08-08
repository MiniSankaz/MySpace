"use client";

import React, { useState, useEffect } from "react";
import surveyService from "@/modules/survey/services/surveyService";
import { Survey } from "@/modules/survey/types";

interface SurveySelectorProps {
  value?: string;
  onChange: (surveyId: string) => void;
}

export function SurveySelector({ value, onChange }: SurveySelectorProps) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const result = await surveyService.getSurveys({ status: "active" });
      setSurveys(result.surveys);
    } catch (error) {
      console.error("Failed to load surveys:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-md">
        <span className="text-gray-500">Loading surveys...</span>
      </div>
    );
  }

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
    >
      <option value="">Select a survey</option>
      {surveys.map((survey) => (
        <option key={survey.id} value={survey.id}>
          {survey.title?.en || survey.title?.th || "Untitled Survey"}
          {survey._count?.SurveyResponse
            ? ` (${survey._count.SurveyResponse} responses)`
            : ""}
        </option>
      ))}
    </select>
  );
}

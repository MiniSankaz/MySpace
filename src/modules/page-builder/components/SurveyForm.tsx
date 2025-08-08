"use client";

import React, { useEffect, useState } from "react";
import surveyService from "@/modules/survey/services/surveyService";
import { Survey } from "@/modules/survey/types";
import { SurveyResponseForm } from "@/modules/survey/components/SurveyResponseForm";

interface SurveyFormProps {
  surveyId?: string;
}

export function SurveyForm({ surveyId }: SurveyFormProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId]);

  const loadSurvey = async () => {
    if (!surveyId) return;

    try {
      setLoading(true);
      const data = await surveyService.getSurvey(surveyId);
      setSurvey(data);
    } catch (error) {
      console.error("Failed to load survey:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (responses: any) => {
    try {
      await surveyService.submitResponse(surveyId!, responses);
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit survey response:", error);
    }
  };

  if (!surveyId) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-gray-500">No survey selected</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 text-green-500 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Thank you!
        </h3>
        <p className="text-green-700">
          Your response has been submitted successfully.
        </p>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <p className="text-red-600">Survey not found</p>
      </div>
    );
  }

  if (survey.status !== "active") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <p className="text-yellow-800">This survey is not currently active</p>
      </div>
    );
  }

  return <SurveyResponseForm survey={survey} onSubmit={handleSubmit} />;
}

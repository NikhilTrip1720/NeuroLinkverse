import { env } from '../config/env';
import { logger } from '../config/logger';
import { StudyPlanContent } from '@skillshare-circles/shared';
import { AppError } from '../utils/errors';

interface StudyPlanRequest {
  subject: string;
  duration: string;
  level: string;
  goals?: string;
}

const DURATION_WEEKS: Record<string, number> = {
  '1_week': 1,
  '2_weeks': 2,
  '1_month': 4,
  '3_months': 12,
  '6_months': 24,
};

export async function generateStudyPlan(request: StudyPlanRequest): Promise<StudyPlanContent> {
  if (!env.GEMINI_API_KEY) {
    return generateMockStudyPlan(request);
  }

  const weeks = DURATION_WEEKS[request.duration] || 4;
  const prompt = buildStudyPlanPrompt(request, weeks);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('Gemini API error', { error, status: response.status });
      throw new AppError('AI service temporarily unavailable', 503);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new AppError('No response from AI service', 503);
    }

    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      throw new AppError('Invalid AI response format', 503);
    }

    return JSON.parse(jsonMatch[1]) as StudyPlanContent;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to generate study plan', { error });
    return generateMockStudyPlan(request);
  }
}

function buildStudyPlanPrompt(request: StudyPlanRequest, weeks: number): string {
  return `Create a comprehensive study plan for:
Subject: ${request.subject}
Duration: ${weeks} weeks
Level: ${request.level}
${request.goals ? `Goals: ${request.goals}` : ''}

Return ONLY a JSON object with this exact structure:
{
  "overview": "Brief overview of the study plan",
  "weeks": [
    {
      "week": 1,
      "title": "Week title",
      "topics": ["topic1", "topic2"],
      "activities": ["activity1", "activity2"],
      "goals": ["goal1", "goal2"]
    }
  ],
  "resources": ["resource1", "resource2"],
  "milestones": ["milestone1", "milestone2"]
}

Create ${weeks} weeks of content. Be specific and practical.`;
}

function generateMockStudyPlan(request: StudyPlanRequest): StudyPlanContent {
  const weeks = DURATION_WEEKS[request.duration] || 4;

  return {
    overview: `A structured ${request.duration.replace('_', ' ')} study plan for ${request.subject} at the ${request.level} level. This plan is designed to build your knowledge progressively.`,
    weeks: Array.from({ length: Math.min(weeks, 6) }, (_, i) => ({
      week: i + 1,
      title: `Week ${i + 1}: ${getWeekTitle(request.subject, i, request.level)}`,
      topics: [
        `Core concepts of ${request.subject} - Part ${i + 1}`,
        `Practical applications`,
        `Key terminology and definitions`,
      ],
      activities: [
        'Read recommended materials for 1-2 hours',
        'Complete practice exercises',
        'Review and summarize key learnings',
        'Discuss with study circle members',
      ],
      goals: [
        `Understand the fundamentals covered this week`,
        `Complete all practice exercises`,
        `Be able to explain concepts to others`,
      ],
    })),
    resources: [
      `Official ${request.subject} documentation`,
      'Online courses on Coursera or edX',
      `${request.subject} community forums and discussions`,
      'YouTube tutorials for visual learning',
      'Practice problems and exercises',
    ],
    milestones: [
      `Complete foundational understanding of ${request.subject}`,
      'Build first practical project',
      'Demonstrate knowledge through peer teaching',
      'Complete final assessment or project',
    ],
  };
}

function getWeekTitle(subject: string, weekIndex: number, level: string): string {
  const phases = ['Introduction & Foundations', 'Core Concepts', 'Deep Dive', 'Advanced Topics', 'Practice & Application', 'Review & Mastery'];
  if (level === 'beginner' && weekIndex === 0) return `Introduction to ${subject}`;
  return phases[weekIndex % phases.length];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export interface EmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
  body?: string;
}

export interface CoachingResponse {
  analysis: string;
  motivationalQuote: string;
  panicLevel: 'MODERATE' | 'HIGH' | 'CRITICAL';
  criticalAction: string;
  microSteps: {
    step: string;
    durationMinutes: number;
    description: string;
  }[];
}

export interface FocusRecommendation {
  title: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  rationale: string;
}

export interface DeadlineEmail {
  id: string;
  subject: string;
  sender: string;
  date: string;
  detectedDeadline: string;
  urgency: 'low' | 'medium' | 'high';
  summary: string;
  recommendedAction: string;
}

export interface PreworkDraft {
  title: string;
  content: string;
  type: 'prep_doc' | 'introduction' | 'extension_request';
}

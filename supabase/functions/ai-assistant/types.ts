export type AssistantMode = 'student_advising' | 'faculty_advising' | 'howto';

export type AssistantTurnRole = 'user' | 'assistant';

export interface AssistantTurn {
    role: AssistantTurnRole;
    content: string;
}

export interface AssistantRequestBody {
    message?: string;
    history?: AssistantTurn[];
    activeRole?: string;
    sectionId?: string | null;
    termId?: string | null;
}

export interface AssistantContext {
    success: boolean;
    message?: string;
    mode?: AssistantMode;
    active_role?: string;
    profile?: Record<string, unknown> | null;
    insight?: Record<string, unknown> | null;
    dashboard?: Record<string, unknown> | null;
    section?: Record<string, unknown> | null;
}

export interface GeminiPart {
    text?: string;
}

export interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

export interface GeminiCandidate {
    content?: GeminiContent;
    finishReason?: string;
}

export interface GeminiResponse {
    candidates?: GeminiCandidate[];
    promptFeedback?: { blockReason?: string };
    error?: { message?: string };
}

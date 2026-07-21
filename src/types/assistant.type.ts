export type AssistantMode = 'student_advising' | 'faculty_advising' | 'howto';

export type AssistantTurnRole = 'user' | 'assistant';

export interface AssistantTurn {
    role: AssistantTurnRole;
    content: string;
}

export interface AssistantMessage extends AssistantTurn {
    id: string;
    isFailed?: boolean;
}

export interface AssistantRequest {
    message: string;
    history: AssistantTurn[];
    activeRole: string;
    sectionId: string | null;
    termId: string | null;
}

export interface AssistantReply {
    success: boolean;
    message?: string;
    reply: string;
    mode: AssistantMode;
}
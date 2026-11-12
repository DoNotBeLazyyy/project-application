import { callFunction } from '@services/supabase.wrapper';
import { AssistantMessage, AssistantReply, AssistantTurn } from '@type/assistant.type';
import { ServiceResult } from '@type/service.type';

// Chat history is kept per browser tab, under this prefix plus the user id
export const ASSISTANT_CHAT_STORAGE_PREFIX = 'au-jas-assistant-chat:';

// Older turns are dropped so the saved chat stays small
const MAX_SAVED_MESSAGES = 50;

/**
 * Reads the saved chat for a user. Bad or blocked storage gives an empty chat.
 *
 * @param userId - The signed-in user.
 * @returns The saved messages, oldest first.
 */
export function loadAssistantChat(userId: string): AssistantMessage[] {
    try {
        const raw = sessionStorage.getItem(`${ASSISTANT_CHAT_STORAGE_PREFIX}${userId}`);
        const parsed: unknown = raw
            ? JSON.parse(raw)
            : [];

        return Array.isArray(parsed)
            ? (parsed as AssistantMessage[]).filter((item) => typeof item?.content === 'string' && typeof item?.id === 'string')
            : [];
    }
    catch {
        return [];
    }
}

/**
 * Saves the chat for a user, so a page refresh keeps the conversation.
 *
 * @param userId - The signed-in user.
 * @param messages - The whole chat, oldest first.
 */
export function saveAssistantChat(userId: string, messages: AssistantMessage[]): void {
    try {
        const key = `${ASSISTANT_CHAT_STORAGE_PREFIX}${userId}`;

        if (messages.length === 0) {
            sessionStorage.removeItem(key);
            return;
        }

        sessionStorage.setItem(key, JSON.stringify(messages.slice(-MAX_SAVED_MESSAGES)));
    }
    catch {
        // Storage can be full or blocked; the chat still works without it
    }
}

/**
 * Removes every saved chat in this tab. Called on sign out.
 */
export function clearAssistantChats(): void {
    try {
        const keys: string[] = [];

        for (let index = 0; index < sessionStorage.length; index += 1) {
            const key = sessionStorage.key(index);
            if (key?.startsWith(ASSISTANT_CHAT_STORAGE_PREFIX)) {
                keys.push(key);
            }
        }

        keys.forEach((key) => sessionStorage.removeItem(key));
    }
    catch {
        // Storage can be blocked; nothing to clear then
    }
}

export async function askAssistant(
    message: string,
    history: AssistantTurn[],
    activeRole: string,
    sectionId: string | null,
    termId: string | null
): Promise<ServiceResult<AssistantReply>> {
    const timeoutPromise = new Promise<ServiceResult<AssistantReply>>((resolve) => {
        setTimeout(() => {
            resolve({
                data: null,
                error: {
                    code: 'TIMEOUT',
                    status: 504,
                    message: 'The AI assistant took too long to respond. Please try again in a moment.'
                }
            });
        }, 25000);
    });

    try {
        const fetchPromise = callFunction<AssistantReply>('ai-assistant', {
            message,
            history,
            activeRole,
            sectionId,
            termId
        }, { background: true, silent: true });

        const result = await Promise.race([fetchPromise, timeoutPromise]);
        if (result.error) {
            const raw = result.error.message || '';
            if (/compute resources|504|timeout|failed to fetch/i.test(raw)) {
                return {
                    data: null,
                    error: {
                        code: 'SERVICE_UNAVAILABLE',
                        status: 503,
                        message: 'The AI assistant is temporarily busy or unavailable. Please try again in a few moments.'
                    }
                };
            }
        }
        return result;
    }
    catch {
        return {
            data: null,
            error: {
                code: 'UNEXPECTED_ERROR',
                status: 500,
                message: 'The AI assistant is temporarily busy or unavailable. Please try again in a few moments.'
            }
        };
    }
}
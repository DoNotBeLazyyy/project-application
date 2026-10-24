import { callFunction } from '@services/supabase.wrapper';
import { AssistantReply, AssistantTurn } from '@type/assistant.type';
import { ServiceResult } from '@type/service.type';

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

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
    return callFunction<AssistantReply>('ai-assistant', {
        message,
        history,
        activeRole,
        sectionId,
        termId
    });
}
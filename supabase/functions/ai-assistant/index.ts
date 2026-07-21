import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateReply } from './gemini.ts';
import { buildSystemInstruction } from './prompt.ts';
import { AssistantContext, AssistantRequestBody, AssistantTurn } from './types.ts';

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const MAX_MESSAGE_LENGTH = 2000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}

function failure(message: string, status: number, detail?: string): Response {
    return jsonResponse({ success: false, message, detail }, status);
}

function sanitizeHistory(history: unknown): AssistantTurn[] {
    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .filter((turn): turn is AssistantTurn => (
            typeof turn === 'object'
            && turn !== null
            && typeof (turn as AssistantTurn).content === 'string'
            && ((turn as AssistantTurn).role === 'user' || (turn as AssistantTurn).role === 'assistant')
        ))
        .map((turn) => ({
            role: turn.role,
            content: turn.content.slice(0, MAX_MESSAGE_LENGTH)
        }));
}

function sanitizeUuid(value: unknown): string | null {
    return typeof value === 'string' && UUID_PATTERN.test(value)
        ? value
        : null;
}

Deno.serve(async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
        return failure('Unsupported request method.', 405);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
        return failure('The assistant is not configured on this environment.', 500);
    }

    const authorization = request.headers.get('Authorization');

    if (!authorization) {
        return failure('You must be signed in to use the assistant.', 401);
    }

    let body: AssistantRequestBody;

    try {
        body = await request.json() as AssistantRequestBody;
    }
    catch {
        return failure('The request could not be read.', 400);
    }

    const message = typeof body.message === 'string'
        ? body.message.trim()
            .slice(0, MAX_MESSAGE_LENGTH)
        : '';

    if (message.length === 0) {
        return failure('Please type a question first.', 400);
    }

    const activeRole = typeof body.activeRole === 'string'
        ? body.activeRole.trim()
        : '';

    if (activeRole.length === 0) {
        return failure('No active role was provided.', 400);
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: authData, error: authError } = await client.auth.getUser();

    if (authError || !authData?.user) {
        return failure('Your session has expired. Please sign in again.', 401);
    }

    const { data: context, error: contextError } = await client.rpc('fn_get_assistant_context', {
        p_active_role: activeRole,
        p_section_id: sanitizeUuid(body.sectionId),
        p_term_id: sanitizeUuid(body.termId)
    });

    if (contextError) {
        return failure('Your information could not be loaded right now.', 400);
    }

    const assistantContext = context as AssistantContext | null;

    if (!assistantContext?.success) {
        return failure(assistantContext?.message ?? 'Your information could not be loaded right now.', 403);
    }

    const { reply, message: failureMessage, detail } = await generateReply(
        apiKey,
        buildSystemInstruction(assistantContext),
        sanitizeHistory(body.history),
        message
    );

    if (!reply) {
        return failure(failureMessage ?? 'The assistant is unavailable right now.', 502, detail);
    }

    return jsonResponse({ success: true, reply, mode: assistantContext.mode }, 200);
});

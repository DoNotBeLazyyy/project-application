import { AssistantTurn, GeminiContent, GeminiResponse } from './types.ts';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-flash-latest';
const FALLBACK_MODEL = 'gemini-flash-lite-latest';
const MAX_HISTORY_TURNS = 10;
const RETRY_DELAYS_MS = [700, 2000];
const BUSY_MESSAGE = 'The assistant is busy right now. Please try again in a moment.';
const UNAVAILABLE_MESSAGE = 'The assistant is unavailable right now. Please try again later.';

export interface GeminiResult {
    reply: string | null;
    message: string | null;
    detail?: string;
}

async function readUpstreamError(response: Response): Promise<string> {
    try {
        const body = await response.text();
        const parsed = JSON.parse(body) as GeminiResponse;

        return parsed.error?.message
            ?? body.slice(0, 300);
    }
    catch {
        return 'no readable body';
    }
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

function isOverloadedStatus(status: number): boolean {
    return status === 429 || status === 503;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toGeminiContents(history: AssistantTurn[], message: string): GeminiContent[] {
    const recent = history.slice(-MAX_HISTORY_TURNS);
    const contents: GeminiContent[] = recent
        .filter((turn) => typeof turn.content === 'string' && turn.content.trim().length > 0)
        .map((turn) => ({
            role: turn.role === 'assistant'
                ? 'model'
                : 'user',
            parts: [{ text: turn.content }]
        }));

    contents.push({ role: 'user', parts: [{ text: message }] });

    return contents;
}

function extractReply(payload: GeminiResponse): string | null {
    const parts = payload.candidates?.[0]?.content?.parts;

    if (!parts) {
        return null;
    }

    const text = parts
        .map((part) => part.text ?? '')
        .join('')
        .trim();

    return text.length > 0
        ? text
        : null;
}

function resolveModel(primary: string, attempt: number): string {
    const isLastAttempt = attempt === RETRY_DELAYS_MS.length;

    return isLastAttempt && primary !== FALLBACK_MODEL
        ? FALLBACK_MODEL
        : primary;
}

export async function generateReply(
    apiKey: string,
    systemInstruction: string,
    history: AssistantTurn[],
    message: string
): Promise<GeminiResult> {
    const primary = Deno.env.get('GEMINI_MODEL') ?? DEFAULT_MODEL;
    const requestBody = JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: toGeminiContents(history, message),
        generationConfig: {
            temperature: 0.3,
            topP: 0.9,
            maxOutputTokens: 2048
        }
    });

    let lastDetail = 'no attempt completed';
    let wasOverloaded = false;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        const model = resolveModel(primary, attempt);

        if (attempt > 0) {
            await delay(RETRY_DELAYS_MS[attempt - 1]);
        }

        let response: Response;

        try {
            response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: requestBody
            });
        }
        catch (error) {
            lastDetail = `${model} could not be reached: ${String(error)}`;
            console.error(lastDetail);
            continue;
        }

        if (!response.ok) {
            lastDetail = `${model} responded ${response.status}: ${await readUpstreamError(response)}`;
            console.error(lastDetail);

            if (!isRetryableStatus(response.status)) {
                return { reply: null, message: UNAVAILABLE_MESSAGE, detail: lastDetail };
            }

            wasOverloaded = isOverloadedStatus(response.status);
            continue;
        }

        const payload = await response.json() as GeminiResponse;

        if (payload.promptFeedback?.blockReason) {
            return {
                reply: null,
                message: 'That request could not be answered. Please rephrase it.',
                detail: `blocked: ${payload.promptFeedback.blockReason}`
            };
        }

        const reply = extractReply(payload);

        if (reply) {
            return { reply, message: null };
        }

        lastDetail = `${model} returned no text, finishReason: ${payload.candidates?.[0]?.finishReason ?? 'none'}`;
        console.error(lastDetail);

        return {
            reply: null,
            message: 'The assistant did not return an answer. Please try again.',
            detail: lastDetail
        };
    }

    return {
        reply: null,
        message: wasOverloaded
            ? BUSY_MESSAGE
            : UNAVAILABLE_MESSAGE,
        detail: lastDetail
    };
}

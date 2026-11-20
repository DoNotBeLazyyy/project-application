export interface ParsedAuthError {
    errorCode: string | null;
    errorDescription: string | null;
    userMessage: string;
}

export function parseAuthUrlError(): ParsedAuthError | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
    const search = window.location.search.startsWith('?')
        ? window.location.search.substring(1)
        : window.location.search;

    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(search);

    const error = hashParams.get('error') || searchParams.get('error');
    const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
    const rawDesc = hashParams.get('error_description') || searchParams.get('error_description');

    if (!error && !errorCode && !rawDesc) {
        return null;
    }

    const decodedDesc = rawDesc
        ? decodeURIComponent(rawDesc.replace(/\+/g, ' '))
        : null;

    let userMessage = decodedDesc || 'An authentication error occurred.';
    if (
        errorCode === 'otp_expired'
        || decodedDesc?.toLowerCase()
            .includes('expired')
        || decodedDesc?.toLowerCase()
            .includes('invalid')
    ) {
        userMessage
            = 'Your invitation or password reset link has expired or has already been used. Please request a new link using "Forgot password?" below or contact your administrator.';
    }

    return {
        errorCode,
        errorDescription: decodedDesc,
        userMessage
    };
}

export function clearAuthUrlError(): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (window.location.hash && window.location.hash.includes('error=')) {
        window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
        );
    }
}
// How Supabase says a session was started: these all come from an emailed invite/reset link
const LINK_AUTH_METHODS = ['otp', 'recovery', 'invite', 'magiclink', 'email/signup'];

/**
 * True when the session was started by an emailed link rather than a password sign-in.
 * Read from the access token's `amr` claim; an unreadable token counts as not from a link.
 */
export function isLinkSession(accessToken: string | undefined | null): boolean {
    if (!accessToken) {
        return false;
    }

    try {
        const payload = accessToken.split('.')[1] ?? '';
        const json = atob(payload.replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(Math.ceil(payload.length / 4) * 4, '='));
        const claims = JSON.parse(json) as { amr?: { method?: string }[] };

        return (claims.amr ?? []).some((entry) => LINK_AUTH_METHODS.includes(entry.method ?? ''));
    }
    catch {
        return false;
    }
}
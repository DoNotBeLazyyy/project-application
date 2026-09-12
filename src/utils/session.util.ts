import { cookieStorage } from '@utils/cookie.util';

export const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const DEFAULT_COUNTDOWN_MS = 60 * 1000; // 1 minute
export const TOTAL_INACTIVITY_LIMIT_MS = DEFAULT_IDLE_TIMEOUT_MS + DEFAULT_COUNTDOWN_MS; // 31 minutes
export const LAST_ACTIVE_STORAGE_KEY = 'au_jas_last_active_at';

/**
 * Saves the current timestamp as the user's latest activity in both localStorage and cookies.
 */
export function recordActivity(): void {
    const nowStr = Date.now()
        .toString();

    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LAST_ACTIVE_STORAGE_KEY, nowStr);
        }
    }
    catch {
        // Fall back to cookie storage if localStorage is restricted
    }

    try {
        cookieStorage.setItem(LAST_ACTIVE_STORAGE_KEY, nowStr);
    }
    catch {
        // Safe ignore for restricted cookie environments
    }
}

/**
 * Retrieves the timestamp of the user's last recorded action.
 */
export function getLastActivity(): number | null {
    try {
        if (typeof localStorage !== 'undefined') {
            const rawVal = localStorage.getItem(LAST_ACTIVE_STORAGE_KEY);
            if (rawVal) {
                const parsed = parseInt(rawVal, 10);
                if (!Number.isNaN(parsed) && parsed > 0) {
                    return parsed;
                }
            }
        }
    }
    catch {
        // Fall back to cookieStorage
    }

    try {
        const rawCookie = cookieStorage.getItem(LAST_ACTIVE_STORAGE_KEY);
        if (rawCookie) {
            const parsed = parseInt(rawCookie, 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }
    catch {
        // Safe ignore
    }

    return null;
}

/**
 * Removes the activity timestamp from both storages upon logout.
 */
export function clearActivity(): void {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(LAST_ACTIVE_STORAGE_KEY);
        }
    }
    catch {
        // Ignore
    }

    try {
        cookieStorage.removeItem(LAST_ACTIVE_STORAGE_KEY);
    }
    catch {
        // Ignore
    }
}

/**
 * Checks whether the user has exceeded the allowable inactivity window (31 minutes).
 * If the user has been inactive longer than the limit, the session is expired.
 */
export function isSessionExpiredDueToInactivity(): boolean {
    const lastActive = getLastActivity();

    // If there is no record of activity yet, we do not mark as expired
    if (!lastActive) {
        return false;
    }

    const elapsed = Date.now() - lastActive;
    return elapsed > TOTAL_INACTIVITY_LIMIT_MS;
}

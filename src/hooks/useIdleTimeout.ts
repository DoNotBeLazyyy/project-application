import { logout } from '@services/auth.service';
import {
    DEFAULT_COUNTDOWN_MS,
    DEFAULT_IDLE_TIMEOUT_MS,
    getLastActivity,
    LAST_ACTIVE_STORAGE_KEY,
    recordActivity
} from '@utils/session.util';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseIdleTimeoutOptions {
    idleTime?: number;
    countdownTime?: number;
}

interface UseIdleTimeoutResult {
    isIdle: boolean;
    resetTimer: () => void;
}

export default function useIdleTimeout({
    idleTime = DEFAULT_IDLE_TIMEOUT_MS,
    countdownTime = DEFAULT_COUNTDOWN_MS
}: UseIdleTimeoutOptions = {}): UseIdleTimeoutResult {
    const [isIdle, setIsIdle] = useState(false);
    const isIdleRef = useRef(false);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRecordedRef = useRef<number>(Date.now());

    const clearTimers = useCallback(() => {
        if (idleTimerRef.current !== null) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        if (countdownTimerRef.current !== null) {
            clearTimeout(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
    }, []);

    const resetTimer = useCallback(() => {
        clearTimers();
        isIdleRef.current = false;
        setIsIdle(false);
        recordActivity();
        lastRecordedRef.current = Date.now();

        idleTimerRef.current = setTimeout(() => {
            isIdleRef.current = true;
            setIsIdle(true);
            countdownTimerRef.current = setTimeout(() => {
                logout();
            }, countdownTime);
        }, idleTime);
    }, [idleTime, countdownTime, clearTimers]);

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

        function handleActivity() {
            if (isIdleRef.current) {
                return;
            }

            const now = Date.now();
            if (now - lastRecordedRef.current > 5000) {
                recordActivity();
                lastRecordedRef.current = now;
            }

            if (idleTimerRef.current !== null) {
                clearTimeout(idleTimerRef.current);
            }

            idleTimerRef.current = setTimeout(() => {
                isIdleRef.current = true;
                setIsIdle(true);
                countdownTimerRef.current = setTimeout(() => {
                    logout();
                }, countdownTime);
            }, idleTime);
        }

        function checkInactivity() {
            const lastActive = getLastActivity();
            if (!lastActive) {
                recordActivity();
                return;
            }

            const elapsed = Date.now() - lastActive;
            const totalLimit = idleTime + countdownTime;

            if (elapsed >= totalLimit) {
                clearTimers();
                logout();
            }
            else if (elapsed >= idleTime) {
                clearTimers();
                isIdleRef.current = true;
                setIsIdle(true);
                const remainingCountdown = Math.max(1000, totalLimit - elapsed);
                countdownTimerRef.current = setTimeout(() => {
                    logout();
                }, remainingCountdown);
            }
            else {
                clearTimers();
                isIdleRef.current = false;
                setIsIdle(false);
                const remainingIdle = idleTime - elapsed;
                idleTimerRef.current = setTimeout(() => {
                    isIdleRef.current = true;
                    setIsIdle(true);
                    countdownTimerRef.current = setTimeout(() => {
                        logout();
                    }, countdownTime);
                }, remainingIdle);
            }
        }

        checkInactivity();

        function handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                checkInactivity();
            }
        }

        function handleFocus() {
            checkInactivity();
        }

        function handleStorage(e: StorageEvent) {
            if (e.key === LAST_ACTIVE_STORAGE_KEY && e.newValue) {
                const parsed = parseInt(e.newValue, 10);
                if (!Number.isNaN(parsed) && parsed > lastRecordedRef.current) {
                    lastRecordedRef.current = parsed;
                    if (!isIdleRef.current) {
                        clearTimers();
                        idleTimerRef.current = setTimeout(() => {
                            isIdleRef.current = true;
                            setIsIdle(true);
                            countdownTimerRef.current = setTimeout(() => {
                                logout();
                            }, countdownTime);
                        }, idleTime);
                    }
                }
            }
        }

        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true });
        });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('storage', handleStorage);

        return () => {
            clearTimers();
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('storage', handleStorage);
        };
    }, [clearTimers, idleTime, countdownTime]);

    return { isIdle, resetTimer };
}
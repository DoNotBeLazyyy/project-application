import { logout } from '@services/auth.service';
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
    idleTime = 5000,
    countdownTime = 5000
}: UseIdleTimeoutOptions = {}): UseIdleTimeoutResult {
    const [isIdle, setIsIdle] = useState(false);
    const isIdleRef = useRef(false);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            if (isIdleRef.current) return;
            resetTimer();
        }

        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        resetTimer();

        return () => {
            clearTimers();
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimer, clearTimers]);

    return { isIdle, resetTimer };
}
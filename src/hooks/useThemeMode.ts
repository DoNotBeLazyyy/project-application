import { applyThemeMode, getResolvedTheme, getStoredThemeMode, ThemeMode } from '@utils/theme-mode.util';
import { useEffect, useState } from 'react';

export function useThemeMode() {
    const [mode, setModeState] = useState<ThemeMode>(getStoredThemeMode);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
        getResolvedTheme(getStoredThemeMode())
    );

    useEffect(() => {
        function handleThemeChange(event: Event) {
            const customEvent = event as CustomEvent<{
                mode: ThemeMode;
                resolved: 'light' | 'dark';
            }>;
            if (customEvent.detail) {
                setModeState(customEvent.detail.mode);
                setResolvedTheme(customEvent.detail.resolved);
            } else {
                const current = getStoredThemeMode();
                setModeState(current);
                setResolvedTheme(getResolvedTheme(current));
            }
        }

        window.addEventListener('theme-mode-change', handleThemeChange);
        return () => {
            window.removeEventListener('theme-mode-change', handleThemeChange);
        };
    }, []);

    function setMode(newMode: ThemeMode) {
        setModeState(newMode);
        setResolvedTheme(getResolvedTheme(newMode));
        applyThemeMode(newMode);
    }

    return {
        mode,
        resolvedTheme,
        setMode,
        isDark: resolvedTheme === 'dark'
    };
}

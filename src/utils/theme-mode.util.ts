export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODE_STORAGE_KEY = 'theme-mode';
export const MUI_MODE_STORAGE_KEY = 'mui-mode';

export function getStoredThemeMode(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'system';
    }
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }
    return 'system';
}

export function getResolvedTheme(mode: ThemeMode = getStoredThemeMode()): 'light' | 'dark' {
    if (mode === 'system') {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';
        }
        return 'light';
    }
    return mode;
}

export function applyThemeMode(mode: ThemeMode): void {
    if (typeof window === 'undefined') {
        return;
    }
    const resolved = getResolvedTheme(mode);
    const isDark = resolved === 'dark';

    // 1. Update HTML classes for Tailwind and MUI
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);

    // 2. Set theme data attributes
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-mui-color-scheme', resolved);

    // 3. Update meta[name="color-scheme"] to prevent Chrome heuristic dark mode overrides
    let metaEl = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
    if (!metaEl) {
        metaEl = document.createElement('meta');
        metaEl.name = 'color-scheme';
        document.head.appendChild(metaEl);
    }
    metaEl.content = mode === 'system' ? 'light dark' : resolved;

    // 4. Synchronize localStorage
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    localStorage.setItem(MUI_MODE_STORAGE_KEY, mode);

    // 5. Dispatch event for UI reactivity
    window.dispatchEvent(
        new CustomEvent('theme-mode-change', {
            detail: { mode, resolved }
        })
    );
}

export function initThemeMode(): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const currentMode = getStoredThemeMode();
    applyThemeMode(currentMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
        if (getStoredThemeMode() === 'system') {
            applyThemeMode('system');
        }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => {
        mediaQuery.removeEventListener('change', handleSystemChange);
    };
}

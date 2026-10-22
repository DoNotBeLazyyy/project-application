import { useThemeMode } from '@hooks/useThemeMode';
import { IconButton, Tooltip } from '@mui/material';
import { DesktopIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';

export default function ThemeToggleButton() {
    const { mode, resolvedTheme, setMode } = useThemeMode();

    function handleToggle() {
        if (mode === 'system') {
            setMode(resolvedTheme === 'dark' ? 'light' : 'dark');
        } else if (mode === 'dark') {
            setMode('light');
        } else {
            setMode('system');
        }
    }

    const title = mode === 'system'
        ? `Theme: System (${resolvedTheme}) - Click to toggle`
        : `Theme: ${mode === 'dark' ? 'Dark' : 'Light'} - Click to toggle`;

    return (
        <Tooltip title={title}>
            <IconButton
                aria-label={`Current theme is ${mode}. Click to change theme.`}
                className="hover:bg-white/10 rounded-full text-white/80 transition-colors"
                size="small"
                onClick={handleToggle}
            >
                {mode === 'system'
                    ? <DesktopIcon size={20} weight="bold" />
                    : resolvedTheme === 'dark'
                        ? <MoonIcon size={20} weight="fill" />
                        : <SunIcon size={20} weight="bold" />}
            </IconButton>
        </Tooltip>
    );
}

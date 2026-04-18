import { ClockIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

interface AssessmentTimerProps {
    expiresAt: string | null;
    onExpire: () => void;
}

export default function AssessmentTimer({ expiresAt, onExpire }: AssessmentTimerProps) {
    const [remaining, setRemaining] = useState('');
    const [isWarning, setIsWarning] = useState(false);

    useEffect(function() {
        if (!expiresAt) return;

        const interval = setInterval(function() {
            const diff = new Date(expiresAt)
                .getTime() - Date.now();

            if (diff <= 0) {
                clearInterval(interval);
                setRemaining('00:00');
                onExpire();
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setRemaining(`${String(minutes)
                .padStart(2, '0')}:${String(seconds)
                .padStart(2, '0')}`);
            setIsWarning(diff < 5 * 60 * 1000);
        }, 1000);

        return function() {
            clearInterval(interval);
        };
    }, [expiresAt, onExpire]);

    if (!expiresAt) return null;

    return (
        <div
            className="flex gap-2 items-center px-3 py-1.5 rounded-lg"
            style={{
                backgroundColor: isWarning
                    ? 'var(--mui-palette-error-light)'
                    : 'var(--mui-palette-action-hover)'
            }}
        >
            <ClockIcon
                size={16}
                style={{
                    color: isWarning
                        ? 'var(--mui-palette-error-main)'
                        : 'var(--mui-palette-text-secondary)'
                }}
                weight="bold"
            />
            <span
                className="font-mono font-semibold text-sm"
                style={{
                    color: isWarning
                        ? 'var(--mui-palette-error-main)'
                        : 'var(--mui-palette-text-primary)'
                }}
            >
                {remaining}
            </span>
        </div>
    );
}
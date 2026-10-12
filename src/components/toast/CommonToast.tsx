import { CheckFatIcon, CircleIcon, WarningIcon, XCircleIcon, XIcon } from '@phosphor-icons/react';
import { ToastItem, useToastStore } from '@stores/toast.store';
import { ReactElement } from 'react';

type ToastVariant = ToastItem['variant'];

interface ToastVariantConfig {
    bg: string;
    border: string;
    color: string;
    icon: ReactElement;
}

const TOAST_VARIANTS: Record<ToastVariant, ToastVariantConfig> = {
    error: {
        bg: 'var(--mui-tokens-color-state-errorLight)',
        border: 'var(--mui-tokens-color-state-error)',
        color: 'var(--mui-tokens-color-state-error)',
        icon: <XCircleIcon size={18} weight="fill" />
    },
    success: {
        bg: 'var(--mui-tokens-color-state-successLight)',
        border: 'var(--mui-tokens-color-state-success)',
        color: 'var(--mui-tokens-color-state-success)',
        icon: <CheckFatIcon size={18} weight="fill" />
    },
    warning: {
        bg: 'var(--mui-tokens-color-state-warningLight)',
        border: 'var(--mui-tokens-color-state-warning)',
        color: 'var(--mui-tokens-color-state-warning)',
        icon: <WarningIcon size={18} weight="fill" />
    },
    info: {
        bg: 'var(--mui-tokens-color-secondary-light)',
        border: 'var(--mui-tokens-color-secondary-main)',
        color: 'var(--mui-tokens-color-secondary-main)',
        icon: <CircleIcon size={18} weight="fill" />
    }
};

export default function CommonToast() {
    const { toasts, removeToast } = useToastStore();

    if (!toasts.length) {
        return null;
    }

    return (
        <div className="fixed top-4 left-0 right-0 sm:left-auto sm:right-4 z-9999 flex flex-col gap-2 items-center sm:items-end pointer-events-none px-4 sm:px-0 max-w-full sm:max-w-md">
            {toasts.map(function(toast) {
                const config = TOAST_VARIANTS[toast.variant] ?? TOAST_VARIANTS.error;

                return (
                    <div
                        className="animate-fade-in border flex gap-2.5 items-center justify-between pointer-events-auto px-3.5 py-2 rounded-lg shadow-lg w-auto max-w-full overflow-hidden"
                        key={toast.id}
                        style={{
                            backgroundColor: config.bg,
                            borderColor: config.border,
                            color: config.color
                        }}
                    >
                        <div className="flex gap-2 items-center min-w-0 flex-1">
                            <span className="shrink-0 flex items-center" style={{ color: config.color }}>
                                {config.icon}
                            </span>
                            <span
                                className="text-sm font-medium leading-snug break-words flex-1 min-w-0"
                                style={{
                                    color: config.color,
                                    overflowWrap: 'anywhere',
                                    wordBreak: 'break-word'
                                }}
                            >
                                {toast.message}
                            </span>
                        </div>
                        <button
                            aria-label="Dismiss toast"
                            className="cursor-pointer shrink-0 p-1 -mr-1 rounded hover:opacity-75 focus:outline-none transition-opacity"
                            style={{
                                backgroundColor: 'transparent',
                                color: config.color
                            }}
                            onClick={function() {
                                removeToast(toast.id);
                            }}
                        >
                            <XIcon size={14} weight="bold" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
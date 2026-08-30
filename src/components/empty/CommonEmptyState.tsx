import CommonButton from '@components/button/CommonButton';
import { MagnifyingGlassIcon, TrayIcon } from '@phosphor-icons/react';
import { ReactNode } from 'react';

export interface CommonEmptyStateProps {
    action?: ReactNode;
    actionLabel?: string;
    className?: string;
    description?: string;
    icon?: ReactNode;
    isSearch?: boolean;
    title?: string;
    onAction?: () => void;
}

export default function CommonEmptyState({
    action,
    actionLabel,
    className = '',
    description,
    icon,
    isSearch = false,
    title,
    onAction
}: CommonEmptyStateProps) {
    const defaultTitle = isSearch
        ? 'No matching results found'
        : 'No data found';

    const defaultDescription = isSearch
        ? 'No records match your active search or filters. Try adjusting your query or resetting filters.'
        : 'There are currently no records available to display in this list.';

    return (
        <div className={`flex flex-1 flex-col items-center justify-center min-h-[320px] p-8 text-center select-none w-full ${className}`}>
            <div className="bg-(--mui-tokens-color-neutral-100) border border-(--mui-tokens-color-neutral-200) flex items-center justify-center mb-4 p-5 rounded-full shadow-2xs text-(--mui-tokens-color-neutral-400)">
                {icon ?? (isSearch
                    ? <MagnifyingGlassIcon size={48} weight="duotone" />
                    : <TrayIcon size={48} weight="duotone" />)}
            </div>

            <h3 className="font-bold mb-1.5 md:text-xl text-(--mui-palette-text-primary) text-lg tracking-tight">
                {title ?? defaultTitle}
            </h3>

            <p className="leading-relaxed max-w-md text-(--mui-palette-text-secondary) text-sm">
                {description ?? defaultDescription}
            </p>

            {action && (
                <div className="mt-5">
                    {action}
                </div>
            )}

            {!action && onAction && actionLabel && (
                <div className="mt-5">
                    <CommonButton
                        color="primary"
                        size="small"
                        variant={isSearch
                            ? 'outlined'
                            : 'contained'}
                        onClick={onAction}
                    >
                        {actionLabel}
                    </CommonButton>
                </div>
            )}
        </div>
    );
}
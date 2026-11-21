import CommonButton from '@components/button/CommonButton';
import { CircularProgress } from '@mui/material';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';

export interface ListStatusStateProps {
    className?: string;
    // Message of the failed load; takes precedence over the loading state
    error?: string | null;
    isLoading?: boolean;
    loadingText?: string;
    onRetry?: VoidFunction;
}

/**
 * ListStatusState
 *
 * Stands in for a list's "nothing here yet" message while the list is still
 * loading or after its load failed, so an empty list is never shown as empty
 * before the data is known.
 */
export default function ListStatusState({
    className,
    error,
    isLoading = false,
    loadingText = 'Loading...',
    onRetry
}: ListStatusStateProps) {
    if (error) {
        return (
            <div
                className={classMerge('flex flex-col gap-3 items-center justify-center px-4 py-12 text-center', className)}
                role="alert"
            >
                <WarningCircleIcon
                    className="text-(--mui-palette-error-main)"
                    size={32}
                    weight="duotone"
                />
                <div className="flex flex-col gap-1 max-w-sm">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                        This couldn&rsquo;t be loaded
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {error}
                    </span>
                </div>
                {onRetry && (
                    <CommonButton
                        size="small"
                        variant="outlined"
                        onClick={onRetry}
                    >
                        Try Again
                    </CommonButton>
                )}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div
                aria-live="polite"
                className={classMerge('flex gap-2 items-center justify-center px-4 py-12 text-(--mui-palette-text-secondary) text-xs', className)}
            >
                <CircularProgress size={16} />
                {loadingText}
            </div>
        );
    }

    return null;
}
import { DivProps } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface CommonNavarProps extends DivProps {
    // Content rendered on the left side of the navbar (e.g., search, tabs).
    leftContent?: ReactNode;

    // Content rendered on the right side of the navbar (e.g., notifications, user profile).
    rightContent?: ReactNode;
}

/**
 * CommonNavar
 *
 * A reusable navbar container component with a dark brand background,
 * rounded corners, and a two-section layout (left and right).
 *
 * @example
 * <CommonNavar
 *     leftContent={<>Search and Tabs</>}
 *     rightContent={<>Notifications and Profile</>}
 * />
 */
export default function CommonNavar({
    className,
    leftContent,
    rightContent,
    ...props
}: CommonNavarProps) {
    return (
        <div
            className={
                classMerge(
                    'flex items-center justify-between bg-[var(--mui-tokens-color-brand-950)] px-[var(--mui-tokens-spacing-6)] py-[var(--mui-tokens-spacing-4)]',
                    className
                )}
            {...props}
        >
            <div className="flex items-center gap-[var(--mui-tokens-spacing-4)]">
                {leftContent}
            </div>
            <div className="flex items-center gap-[var(--mui-tokens-spacing-4)]">
                {rightContent}
            </div>
        </div>
    );
}
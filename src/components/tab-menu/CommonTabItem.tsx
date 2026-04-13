import { CaretRightIcon } from '@phosphor-icons/react';
import { TabMenuSize, TabMenuStyle } from '@type/tab-menu.type';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface CommonTabItemProps {
    // Optional badge counter value
    badge?: number;

    // Additional class names
    className?: string;

    // Whether to show the trailing arrow/caret
    hasArrow?: boolean;

    // Optional leading icon element
    icon?: ReactNode;

    // Whether this tab is currently active/selected
    isActive?: boolean;

    // Tab display label
    label: string;

    // Tab menu style variant for styling context
    menuStyle?: TabMenuStyle;

    // Tab size variant
    size?: TabMenuSize;

    // Click handler
    onClick?: VoidFunction;
}

/**
 * CommonTabItem
 *
 * An individual tab item button used within CommonTabMenu.
 * Renders with conditional styling based on active state, menu style, and size.
 *
 * @example
 * <CommonTabItem
 *     isActive
 *     label="Dashboard"
 *     menuStyle="outline"
 *     onClick={() => handleTabChange('dashboard')}
 * />
 */
export default function CommonTabItem({
    badge,
    className,
    hasArrow = false,
    icon,
    isActive = false,
    label,
    menuStyle = 'outline',
    size = 'default',
    onClick
}: CommonTabItemProps) {
    const isSmall = size === 'small';
    const isPill = menuStyle === 'pill';
    const isVertical = menuStyle === 'vertical';
    const sizeClass = isSmall
        ? 'tw_body_small_bold gap-[var(--mui-tokens-spacing-3)] px-[var(--mui-tokens-spacing-3)] py-[var(--mui-tokens-spacing-2)]'
        : 'tw_body_normal_bold gap-[var(--mui-tokens-spacing-2)] px-[var(--mui-tokens-spacing-4)] py-[var(--mui-tokens-spacing-3)]'; // Size-dependent typography and spacing
    const stateClass = isActive
        ? isPill
            ? 'bg-[var(--mui-tokens-color-brand-900)] text-[var(--mui-tokens-color-common-white)]'
            : isVertical
                ? 'bg-[var(--mui-tokens-color-neutral-100)] text-[var(--mui-tokens-color-neutral-700)]'
                : 'text-[var(--mui-tokens-color-neutral-700)]'
        : isPill
            ? 'text-[var(--mui-tokens-color-neutral-400)] hover:bg-[var(--mui-tokens-color-common-white)] hover:text-[var(--mui-tokens-color-neutral-700)]'
            : 'text-[var(--mui-tokens-color-neutral-400)] hover:text-[var(--mui-tokens-color-neutral-700)]'; // Active/inactive state styling
    const buttonClasses = classMerge(
        'cursor-pointer flex items-center shrink-0',
        sizeClass,
        (isPill || isVertical || isSmall) && 'rounded-[var(--mui-tokens-radius-md)]',
        stateClass,
        className
    ); // Resolved button classes

    return (
        <button
            aria-selected={isActive}
            className={buttonClasses}
            role="tab"
            type="button"
            onClick={onClick}
        >
            {icon && (
                <span
                    className={
                        classMerge(
                            'flex items-center justify-center shrink-0',
                            isSmall
                                ? 'size-[var(--mui-tokens-spacing-6)]'
                                : 'size-[var(--mui-tokens-spacing-7)]',
                            isActive && !isPill && 'text-[var(--mui-tokens-color-brand-900)]'
                        )
                    }
                >
                    {icon}
                </span>
            )}

            <span className="whitespace-nowrap">
                {label}
            </span>

            {badge !== undefined && (
                <span
                    className={
                        classMerge(
                            'bg-[var(--mui-tokens-color-brand-500)] flex font-bold items-center justify-center',
                            'rounded-[var(--mui-tokens-radius-full)] shrink-0 text-[var(--mui-tokens-color-common-white)]',
                            isSmall
                                ? 'leading-[9.6px] min-w-[var(--mui-tokens-spacing-5)] p-[3.2px] text-[8px] w-[var(--mui-tokens-spacing-5)]'
                                : 'leading-[12px] min-w-[var(--mui-tokens-spacing-6)] p-[var(--mui-tokens-spacing-2)] text-[10px] w-[var(--mui-tokens-spacing-6)]'
                        )
                    }
                >
                    {badge}
                </span>
            )}

            {hasArrow && (
                <CaretRightIcon
                    className="shrink-0"
                    size={16}
                    weight="bold"
                />
            )}
        </button>
    );
}
import { CaretRightIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';

interface TabMenuLabelProps {
    // Optional badge counter value
    badge?: number;

    // Badge size class
    badgeSize: string;

    // Whether to show trailing arrow/caret
    hasArrow?: boolean;

    // Tab display label
    label: string;
}

/**
 * TabMenuLabel
 *
 * Renders the tab label text with optional badge counter and trailing arrow icon.
 *
 * @example
 * <TabMenuLabel
 *     badgeSize="leading-[12px] ..."
 *     label="Dashboard"
 * />
 */
export default function TabMenuLabel({
    badge,
    badgeSize,
    hasArrow,
    label
}: TabMenuLabelProps) {
    return (
        <span className="flex gap-(--mui-tokens-spacing-2) items-center whitespace-nowrap">
            {label}
            {badge !== undefined && (
                <span
                    className={
                        classMerge(
                            'bg-(--mui-tokens-color-brand-500) flex font-bold items-center justify-center rounded-(--mui-tokens-radius-full) shrink-0 text-(--mui-tokens-color-common-white)',
                            badgeSize
                        )
                    }
                >
                    {badge}
                </span>
            )}
            {hasArrow && <CaretRightIcon
                className="shrink-0"
                size={16}
                weight="bold"
            />}
        </span>
    );
}
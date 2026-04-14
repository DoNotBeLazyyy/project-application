import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

interface TabMenuIconProps {
    // Icon element to render
    icon: ReactNode;

    // Icon container size class
    iconSize: string;
}

/**
 * TabMenuIcon
 *
 * Wraps a tab icon element with consistent sizing and the tab-icon class
 * used for active state color targeting in theme overrides.
 *
 * @example
 * <TabMenuIcon
 *     icon={<HouseIcon />}
 *     iconSize="size-[var(--mui-tokens-spacing-7)]"
 * />
 */
export default function TabMenuIcon({
    icon,
    iconSize
}: TabMenuIconProps) {
    return (
        <span
            className={
                classMerge(
                    'flex items-center justify-center shrink-0 tab-icon',
                    iconSize
                )
            }
        >
            {icon}
        </span>
    );
}
import { TabProps, Tab } from '@mui/material';
import { House } from '@phosphor-icons/react';
import { ReactElementOrBoolean, ReactUndefined } from '@type/common.type';

interface TabMenuItemProps extends Omit<TabProps, 'icon'> {
    // whether all tabs are disabled (from parent).
    allDisabled?: boolean;

    // icon for the tab (true renders default House icon).
    icon?: ReactElementOrBoolean;

    // icon color for the active filled variant.
    iconColor?: string;

    // whether the tab is currently active.
    isActive: boolean;
}

/**
 * TabMenuItem
 * Renders a single tab item with icon and style support.
 */
export default function TabMenuItem({
    allDisabled,
    disabled,
    icon,
    iconColor,
    isActive,
    sx,
    ...tabProps
}: TabMenuItemProps) {
    const tabIcon: ReactUndefined = icon === true // If icon is strictly true.
        ? <House
            color={isActive
                ? iconColor
                : undefined}
            size={16}
            weight="fill" />
        : icon || undefined; // If icon is true, render default icon; if it's a ReactElement, render it; otherwise undefined
    const disabledState = allDisabled || disabled; // Determine if the tab should be disabled based on individual and global state

    return (
        <Tab
            {...tabProps}
            disabled={disabledState}
            disableRipple
            icon={tabIcon}
            iconPosition="start"
            sx={sx}
        />
    );
}
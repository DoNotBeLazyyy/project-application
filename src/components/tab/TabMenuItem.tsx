import { House } from '@phosphor-icons/react';
import { TabItem } from '@components/tab/CommonTabMenu';
import Tab from '@mui/material/Tab';
import { SxProps, Theme } from '@mui/material/styles';
import { ReactElement } from 'react';

interface TabMenuItemProps extends TabItem {
    // whether all tabs are disabled (from parent).
    allDisabled?: boolean;

    // icon color for the active filled variant.
    iconColor?: string;

    // whether the tab is currently active.
    isActive: boolean;

    // sx styles for the tab.
    sx: SxProps<Theme>;
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
    const tabIcon: ReactElement | undefined = icon === true
        ? <House
            color={isActive
                ? iconColor
                : undefined}
            size={16}
            weight="fill" />
        : icon || undefined;

    return (
        <Tab
            {...tabProps}
            disabled={allDisabled || disabled}
            disableRipple
            icon={tabIcon}
            iconPosition="start"
            sx={sx}
        />
    );
}
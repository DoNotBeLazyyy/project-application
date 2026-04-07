import TabMenuItem from '@components/tab/TabMenuItem';
import { createTabTheme } from '@constants/theme/components-theme.constant';
import Tabs, { TabsProps } from '@mui/material/Tabs';
import { StringNum, ThemeSx } from '@type/common.type';
import { normalizeSx } from '@utils/theme-util';
import { ReactElement, SyntheticEvent, useMemo } from 'react';

// Tab menu variant type
export type TabMenuVariant = 'filled' | 'outlined' | 'pill' | 'soft';

// Tab item type definition
export type TabItemOrString = TabItem[] | string[];

export interface TabItem {
    // whether this individual tab is disabled.
    disabled?: boolean;

    // icon for the tab.
    icon?: ReactElement | boolean;

    // label text for the tab.
    label: string;

    // unique value identifying this tab.
    value: StringNum;
}

export interface CommonTabMenuProps extends Pick<TabsProps, 'orientation'> {
    // custom color for the active tab state.
    customColor?: string;

    // whether all tabs are disabled.
    disabled?: boolean;

    // custom sx styles for the tabs container.
    sx?: ThemeSx;

    // custom sx styles applied to each tab button.
    tabSx?: ThemeSx;

    // array of tab items or simple string labels to render.
    tabs: TabItemOrString;

    // currently selected tab value (controlled).
    value: StringNum;

    // visual variant of the tab menu.
    variant?: TabMenuVariant;

    // callback fired when the selected tab changes.
    onSetActiveSheet: (value: StringNum) => void;
}

/**
 * CommonTabMenu
 * A reusable tab menu component that wraps MUI Tabs/Tab and
 * supports filled, outlined, and soft variants with customizable colors.
 *
 * Example:
 * <CommonTabMenu
 *     tabs={['Tab 1', 'Tab 2', 'Tab 3']}
 *     value={selected}
 *     variant="filled"
 *     onSetActiveSheet={(value) => setSelected(value)}
 * />
 */
export default function CommonTabMenu({
    customColor,
    disabled,
    orientation = 'horizontal',
    sx,
    tabSx,
    tabs,
    value,
    variant = 'filled',
    onSetActiveSheet
}: CommonTabMenuProps) {
    const normalizedTabs: TabItem[] = tabs.map((tab, index) =>
        typeof tab === 'string'
            ? { label: tab, value: index }
            : tab); // normalize string[] to TabItem[].
    const color = customColor ?? '#022179'; // default active color if customColor is not provided.
    const isFilled = variant === 'filled'; // isFilled is used to determine if the filled variant is active.
    const isVertical = orientation === 'vertical'; // isvertical is used to vertical orientation.
    const tabStyles = useMemo(
        () => createTabTheme(color, variant, isVertical),
        [color, variant, isVertical]
    ); // create memoized sx styles based on color, variant.

    /**
     * Handle tab change event and call onChange with the new value.
     *
     * @param _ - The event object (not used).
     * @param newValue - The value of the newly selected tab.
     */
    function handleChange(_: SyntheticEvent, newValue: StringNum) {
        onSetActiveSheet(newValue);
    }

    return (
        <Tabs
            orientation={orientation}
            sx={[tabStyles.tabs, ...normalizeSx(sx)]}
            value={value}
            onChange={handleChange}
        >
            {normalizedTabs.map((tab) => (
                <TabMenuItem
                    {...tab}
                    allDisabled={disabled}
                    iconColor={isFilled
                        ? '#F2F7FE'
                        : '#022179'}
                    isActive={value === tab.value}
                    key={tab.value}
                    sx={[tabStyles.tab, ...normalizeSx(tabSx)]}
                />
            ))}
        </Tabs>
    );
}
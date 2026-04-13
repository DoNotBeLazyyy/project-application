import TabMenuItem from '@components/tab/TabMenuItem';
import { TabsProps, Tabs } from '@mui/material';
import { StringNum, ThemeSx } from '@type/common.type';
import { TabItemOrString, TabMenuVariant } from '@type/tab.types';
import { normalizeSx } from '@utils/theme-util';
import { ReactElement, SyntheticEvent } from 'react';

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

export interface CommonTabMenuProps extends Omit<TabsProps, 'variant'> {
    // whether all tabs are disabled.
    disabled?: boolean;

    // array of tab items or simple string labels to render.
    tabs: TabItemOrString;

    // custom sx styles applied to each tab button.
    tabSx?: ThemeSx;

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
            ? {
                label: tab,
                value: index
            }
            : tab); // normalize string[] to TabItem[].
    const iconColor = variant === 'filled'
        ? '#F2F7FE'
        : '#022179'; // icon color depends on whether the filled variant is active.

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
            sx={normalizeSx(sx as ThemeSx)}
            tabVariant={variant}
            value={value}
            onChange={handleChange}
        >
            {normalizedTabs.map((tab) => {
                const isActive = value === tab.value;

                return (
                    <TabMenuItem
                        {...tab}
                        allDisabled={disabled}
                        iconColor={iconColor}
                        isActive={isActive}
                        key={tab.value}
                        sx={normalizeSx(tabSx)}
                        tabVariant={variant}
                    />
                );
            })}
        </Tabs>
    );
}
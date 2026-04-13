import { Tab, Tabs, TabsProps } from '@mui/material';
import { CaretRightIcon } from '@phosphor-icons/react';
import { TabItemData, TabMenuSize, TabMenuStyle } from '@type/tab-menu.type';
import { classMerge } from '@utils/css.util';

export interface CommonTabMenuProps extends TabsProps {
    // Tab menu style variant
    menuStyle?: TabMenuStyle;

    // Tab size variant
    size?: TabMenuSize;

    // Array of tab configurations to render
    tabs: TabItemData[];
}

/**
 * CommonTabMenu
 *
 * A fully controlled tab menu component built on MUI Tabs, supporting
 * three style variants (outline, pill, vertical) and two size options (default, small).
 *
 * @example
 * <CommonTabMenu
 *     menuStyle="outline"
 *     tabs={[
 *         { label: 'Dashboard', value: 'dashboard', icon: <HouseIcon /> },
 *         { label: 'Settings', value: 'settings' }
 *     ]}
 *     value={activeTab}
 *     onChange={setActiveTab}
 * />
 */
export default function CommonTabMenu({
    menuStyle = 'outline',
    size = 'default',
    tabs,
    ...props
}: CommonTabMenuProps) {
    const isSmall = size === 'small'; // Small size flag
    const orientation = menuStyle === 'vertical'
        ? 'vertical'
        : 'horizontal'; // Tabs orientation
    const iconSize = isSmall
        ? 'size-[var(--mui-tokens-spacing-6)]'
        : 'size-[var(--mui-tokens-spacing-7)]'; // Icon size
    const badgeSize = isSmall
        ? 'leading-[9.6px] min-w-[var(--mui-tokens-spacing-5)] p-[3.2px] text-[8px] w-[var(--mui-tokens-spacing-5)]'
        : 'leading-[12px] min-w-[var(--mui-tokens-spacing-6)] p-[var(--mui-tokens-spacing-2)] text-[10px] w-[var(--mui-tokens-spacing-6)]'; // Badge size

    return (
        <Tabs
            menuStyle={menuStyle}
            orientation={orientation}
            size={size}
            {...props}
        >
            {tabs.map((tab) => (
                <Tab
                    icon={tab.icon
                        ? (
                            <span
                                className={
                                    classMerge(
                                        'flex items-center justify-center shrink-0 tab-icon',
                                        iconSize
                                    )
                                }
                            >
                                {tab.icon}
                            </span>
                        )
                        : undefined}
                    iconPosition="start"
                    key={tab.value}
                    label={
                        <span className="flex gap-[var(--mui-tokens-spacing-2)] items-center whitespace-nowrap">
                            {tab.label}
                            {tab.badge !== undefined && (
                                <span
                                    className={
                                        classMerge(
                                            'bg-[var(--mui-tokens-color-brand-500)] flex font-bold items-center justify-center rounded-[var(--mui-tokens-radius-full)] shrink-0 text-[var(--mui-tokens-color-common-white)]',
                                            badgeSize
                                        )
                                    }
                                >
                                    {tab.badge}
                                </span>
                            )}
                            {tab.hasArrow && (
                                <CaretRightIcon
                                    className="shrink-0"
                                    size={16}
                                    weight="bold"
                                />
                            )}
                        </span>
                    }
                    menuStyle={menuStyle}
                    size={size}
                    value={tab.value}
                />
            ))}
        </Tabs>
    );
}
import TabMenuIcon from '@components/tab-menu/TabMenuIcon';
import TabMenuLabel from '@components/tab-menu/TabMenuLabel';
import { Tab, Tabs, TabsProps } from '@mui/material';
import { TabItemData } from '@type/tab-menu.type';

interface CommonTabMenuProps extends TabsProps {
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
    const isVertical = menuStyle === 'vertical';

    return (
        <Tabs
            data-menu-style={menuStyle}
            data-size={size}
            orientation={
                isVertical
                    ? 'vertical'
                    : 'horizontal'
            }
            scrollButtons="auto"
            variant={
                isVertical
                    ? 'standard'
                    : 'scrollable'
            }
            {...props}
        >
            {tabs.map(({
                badge,
                hasArrow,
                icon,
                label,
                value
            }) => (
                <Tab
                    data-menu-style={menuStyle}
                    data-size={size}
                    icon={icon
                        ? <TabMenuIcon
                            icon={icon}
                            iconSize={
                                isSmall
                                    ? 'size-[var(--mui-tokens-spacing-6)]'
                                    : 'size-[var(--mui-tokens-spacing-7)]'
                            }
                        />
                        : undefined
                    }
                    iconPosition="start"
                    key={value}
                    label={
                        <TabMenuLabel
                            badge={badge}
                            badgeSize={
                                isSmall
                                    ? 'leading-[12px] min-w-[var(--mui-tokens-spacing-6)] p-[3.2px] text-[10px] w-[var(--mui-tokens-spacing-6)]'
                                    : 'leading-[14px] min-w-[var(--mui-tokens-spacing-7)] p-[var(--mui-tokens-spacing-2)] text-xs w-[var(--mui-tokens-spacing-7)]'
                            }
                            hasArrow={hasArrow}
                            label={label}
                        />
                    }
                    value={value}
                />
            ))}
        </Tabs>
    );
}
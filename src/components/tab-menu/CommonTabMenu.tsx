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
            {tabs.map(({
                badge,
                hasArrow,
                icon,
                label,
                value
            }) => (
                <Tab
                    icon={icon
                        ? <TabMenuIcon
                            icon={icon}
                            iconSize={iconSize}
                        />
                        : undefined
                    }
                    iconPosition="start"
                    key={value}
                    label={
                        <TabMenuLabel
                            badge={badge}
                            badgeSize={badgeSize}
                            hasArrow={hasArrow}
                            label={label}
                        />
                    }
                    menuStyle={menuStyle}
                    size={size}
                    value={value}
                />
            ))}
        </Tabs>
    );
}
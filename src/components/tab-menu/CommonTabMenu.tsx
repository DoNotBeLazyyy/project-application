import CommonTabItem from '@components/tab-menu/CommonTabItem';
import { TabItemData, TabMenuSize, TabMenuStyle } from '@type/tab-menu.type';
import { classMerge } from '@utils/css.util';
import { forwardRef, HTMLAttributes } from 'react';

export interface CommonTabMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
    // Tab size variant
    size?: TabMenuSize;

    // Array of tab configurations to render
    tabs: TabItemData[];

    // Currently active tab value
    value: string;

    // Tab menu style variant
    variant?: TabMenuStyle;

    // Callback when active tab changes
    onChange: (value: string) => void;
}

/**
 * CommonTabMenu
 *
 * A fully controlled tab menu component supporting three style variants
 * (outline, pill, vertical) and two size options (default, small).
 *
 * @example
 * <CommonTabMenu
 *     tabs={[
 *         { label: 'Dashboard', value: 'dashboard', icon: <HouseIcon /> },
 *         { label: 'Settings', value: 'settings' }
 *     ]}
 *     value={activeTab}
 *     variant="outline"
 *     onChange={setActiveTab}
 * />
 */
const CommonTabMenu = forwardRef<HTMLDivElement, CommonTabMenuProps>(({
    className,
    size = 'default',
    tabs,
    value,
    variant = 'outline',
    onChange,
    ...props
}, ref) => {
    const isOutline = variant === 'outline';
    const isPill = variant === 'pill';
    const isVertical = variant === 'vertical';

    return (
        <div
            className={
                classMerge(
                    'inline-flex w-fit',
                    isOutline && 'bg-[var(--mui-tokens-color-common-white)] gap-[var(--mui-tokens-spacing-3)] items-center p-[var(--mui-tokens-spacing-2)]',
                    isPill && 'bg-[var(--mui-tokens-color-neutral-100)] gap-[var(--mui-tokens-spacing-3)] items-center p-[var(--mui-tokens-spacing-2)] rounded-[var(--mui-tokens-radius-lg)]',
                    isVertical && 'bg-[var(--mui-tokens-color-common-white)] flex-col gap-[var(--mui-tokens-spacing-3)] items-start p-[var(--mui-tokens-spacing-3)] rounded-[var(--mui-tokens-radius-md)]',
                    className
                )
            }
            ref={ref}
            role="tablist"
            {...props}
        >
            {tabs.map((tab) => {
                const isActive = value === tab.value;

                return isOutline
                    ? (
                        <div
                            className="flex flex-col gap-[var(--mui-tokens-spacing-2)]"
                            key={tab.value}
                        >
                            <CommonTabItem
                                badge={tab.badge}
                                hasArrow={tab.hasArrow}
                                icon={tab.icon}
                                isActive={isActive}
                                label={tab.label}
                                menuStyle="outline"
                                size={size}
                                onClick={() => onChange(tab.value)}
                            />
                            <div
                                className={
                                    classMerge(
                                        'h-[var(--mui-tokens-stroke-1)] rounded-[var(--mui-tokens-radius-full)]',
                                        isActive
                                            ? 'bg-[var(--mui-tokens-color-brand-900)]'
                                            : 'bg-transparent'
                                    )
                                }
                            />
                        </div>
                    )
                    : (
                        <CommonTabItem
                            badge={tab.badge}
                            hasArrow={tab.hasArrow}
                            icon={tab.icon}
                            isActive={isActive}
                            key={tab.value}
                            label={tab.label}
                            menuStyle={variant}
                            size={size}
                            onClick={() => onChange(tab.value)}
                        />
                    );
            })}
        </div>
    );
});
CommonTabMenu.displayName = 'CommonTabMenu';

export default CommonTabMenu;
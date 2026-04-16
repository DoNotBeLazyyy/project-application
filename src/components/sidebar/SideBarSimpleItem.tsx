import CommonButton from '@components/button/CommonButton';
import { SideBarItem } from '@type/sidebar.types';
import { VariantStyle } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';

interface SideBarSimpleItemProps {
    // The sidebar item data to render
    item: SideBarItem;

    // Styles based on the current variant
    styles: VariantStyle;
}

/**
 * SideBarSimpleItem
 *
 * Renders a single clickable sidebar item with an optional icon and label.
 * Applies active and hover styles based on the current sidebar variant.
 *
 * @example
 * <SideBarSimpleItem
 *     item={{
 *         label: "Dashboard",
 *         icon: <DashboardIcon />,
 *         isActive: true,
 *         onClick: () => console.log("Dashboard clicked")
 *     }}
 *     styles={variantStyles}
 * />
 */
export default function SideBarSimpleItem({
    item,
    styles
}: SideBarSimpleItemProps) {
    const {
        icon,
        isActive,
        label,
        onClick
    } = item; // Destructure item properties for easier access.
    const {
        itemActive,
        itemHover,
        itemIcon,
        itemText
    } = styles; // Destructure styles for easier access.

    return (
        <CommonButton
            className={
                classMerge(
                    'flex w-fit items-center rounded-(--mui-tokens-radius-md) text-left transition-colors',
                    isActive
                        ? itemActive
                        : classMerge(
                            itemText,
                            itemHover
                        )
                )
            }
            sx={{
                gap: '10px',
                backgroundColor: 'transparent',
                px: 'var(--mui-tokens-spacing-4)',
                py: 'var(--mui-tokens-spacing-3)',
                fontSize: 'var(--mui-tokens-fontSize-sm)',
                fontWeight: 'var(--mui-tokens-fontWeight-normal)',
                color: 'inherit',
                '&:hover': {
                    backgroundColor: 'transparent'
                },
                '& .sidebar-icon svg': {
                    height: 'var(--mui-tokens-spacing-6)',
                    width: 'var(--mui-tokens-spacing-6)'
                }
            }}
            onClick={onClick}
        >
            {icon && (
                <span
                    className={
                        classMerge(
                            'sidebar-icon flex shrink-0',
                            isActive && itemIcon
                        )
                    }
                >
                    {icon}
                </span>
            )}
            {label}
        </CommonButton>
    );
}
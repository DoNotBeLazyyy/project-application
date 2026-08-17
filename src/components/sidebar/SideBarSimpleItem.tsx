import CommonButton from '@components/button/CommonButton';
import { useSideBarContext } from '@contexts/SideBarContext';
import Tooltip from '@mui/material/Tooltip';
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
 * Collapses to an icon-only button with a tooltip when the sidebar is rendered
 * as a rail. Applies active and hover styles based on the current sidebar variant.
 *
 * @example
 * <SideBarSimpleItem
 *     item={{
 *         label: "Dashboard",
 *         icon: <DashboardIcon />,
 *         isActive: true,
 *         onClick: () => {}
 *     }}
 *     styles={variantStyles}
 * />
 */
export default function SideBarSimpleItem({
    item,
    styles
}: SideBarSimpleItemProps) {
    const { isExpanded } = useSideBarContext();
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
        <Tooltip
            placement="right"
            title={
                isExpanded
                    ? ''
                    : label
            }
        >
            <CommonButton
                className={
                    classMerge(
                        'flex items-center rounded-(--mui-tokens-radius-md) text-left transition-colors',
                        isExpanded
                            ? 'w-fit'
                            : 'w-full justify-center',
                        isActive
                            ? itemActive
                            : classMerge(
                                itemText,
                                itemHover
                            )
                    )
                }
                sx={{
                    gap: isExpanded
                        ? '10px'
                        : 0,
                    minWidth: 0,
                    backgroundColor: 'transparent',
                    px: isExpanded
                        ? 'var(--mui-tokens-spacing-4)'
                        : 'var(--mui-tokens-spacing-2)',
                    py: 'var(--mui-tokens-spacing-3)',
                    fontSize: 'var(--mui-tokens-fontSize-sm)',
                    fontWeight: 'var(--mui-tokens-fontWeight-normal)',
                    color: 'inherit',
                    whiteSpace: 'nowrap',
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
                {isExpanded && label}
            </CommonButton>
        </Tooltip>
    );
}
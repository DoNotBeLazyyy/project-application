import ButtonBase from '@mui/material/ButtonBase';
import { SideBarItem } from '@type/sidebar.types';
import { VariantStyle } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';

interface SideBarSimpleItemProps {
    // The sidebar item data to render
    item: SideBarItem;

    // Styles based on the current variant
    styles: VariantStyle;
}

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
        <ButtonBase
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
            disableRipple
            sx={{
                gap: '10px',
                px: 4,
                py: 3,
                fontSize: 'var(--mui-tokens-fontSize-sm)',
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
        </ButtonBase>
    );
}
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
                    'flex w-fit items-center rounded-[var(--mui-tokens-radius-md)] text-left transition-colors',
                    isActive
                        ? itemActive
                        : classMerge(
                            itemText,
                            itemHover
                        )
                )}
            disableRipple
            sx={{
                gap: '10px',
                px: '12px',
                py: '8px',
                fontSize: '14px',
                '& .sidebar-icon svg': {
                    height: '20px',
                    width: '20px'
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
                        )}
                >
                    {icon}
                </span>
            )}
            {label}
        </ButtonBase>
    );
}
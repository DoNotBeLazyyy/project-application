import type { SideBarItem, VariantStyle } from '@components/sidebar/CommonSideBarList';
import ButtonBase from '@mui/material/ButtonBase';
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
    const isActive = item.isActive; // Determine if the item is active for styling purposes.

    return (
        <ButtonBase
            className={
                classMerge(
                    'flex w-fit items-center rounded-[var(--mui-tokens-radius-md)] text-left transition-colors',
                    isActive
                        ? styles.itemActive
                        : classMerge(
                            styles.itemText,
                            styles.itemHover
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
            onClick={item.onClick}
        >
            {item.icon && (
                <span
                    className={
                        classMerge(
                            'sidebar-icon flex shrink-0',
                            isActive
                                ? ''
                                : styles.itemIcon
                        )}
                >
                    {item.icon}
                </span>
            )}
            {item.label}
        </ButtonBase>
    );
}
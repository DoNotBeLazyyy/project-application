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
                    'flex w-full items-center gap-[var(--mui-tokens-spacing-4)] rounded-[var(--mui-tokens-radius-md)] px-[var(--mui-tokens-spacing-4)] py-[var(--mui-tokens-spacing-3)] text-left text-[length:var(--mui-tokens-fontSize-sm)] transition-colors',
                    isActive
                        ? styles.itemActive
                        : classMerge(
                            styles.itemText,
                            styles.itemHover
                        )
                )}
            disableRipple
            onClick={item.onClick}
        >
            {item.icon && (
                <span
                    className={
                        classMerge(
                            'flex shrink-0 [&>svg]:h-[var(--mui-tokens-spacing-6)] [&>svg]:w-[var(--mui-tokens-spacing-6)]',
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
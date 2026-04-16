import { classMerge } from '@utils/css.util';

interface HeaderTitleProps {
    // CSS class used to control the title text color
    colorClassName: string;

    // Title text displayed in the header
    text?: string;
}
/**
 * HeaderTitle
 *
 * Renders the main title text in the sidebar header with bold styling.
 *
 * @example
 * <HeaderTitle
 *   colorClassName="text-[var(--mui-tokens-color-common-white)]"
 *   text="EGEMCO HRIS"
 * />
 */
export function CommonHeaderTitle({
    colorClassName,
    text
}: HeaderTitleProps) {
    return (
        <p
            className={
                classMerge(
                    'text-(length:--mui-tokens-fontSize-nm) font-(--mui-tokens-fontWeight-bold) leading-5',
                    colorClassName
                )
            }
        >
            {text}
        </p>
    );
}
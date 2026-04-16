import { classMerge } from '@utils/css.util';

interface HeaderSubtitleProps {
    // CSS class used to control the subtitle text color
    colorClassName: string;

    // Subtitle text displayed in the header
    text: string;
}

/**
 * CommonHeaderSubtitle
 *
 * Renders the subtitle text below the title in the sidebar header.
 *
 * @example
 * <CommonHeaderSubtitle
 *   colorClassName="text-[var(--mui-tokens-color-common-white)]"
 *   text="Super User Access"
 * />
 */
export default function CommonHeaderSubtitle({
    colorClassName,
    text
}: HeaderSubtitleProps) {
    return (
        <p
            className={
                classMerge(
                    'text-(length:--mui-tokens-fontSize-xs) leading-snug',
                    colorClassName
                )
            }
        >
            {text}
        </p>
    );
}
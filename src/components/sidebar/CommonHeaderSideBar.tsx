import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import { CaretRight } from '@phosphor-icons/react';
import { DivProps } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

// Variant type for the sidebar header
type SideBarVariant = 'dark' | 'light';

export interface CommonHeaderSideBarProps extends DivProps {
    // Whether to show the dropdown arrow icon
    hasArrow?: boolean;

    // Whether the arrow is in expanded (down) state
    isExpanded?: boolean;

    // Logo element displayed in the header
    logo?: ReactNode;

    // Subtitle text displayed below the title
    subtitle?: string;

    // Props spread onto the arrow IconButton
    buttonProps?: IconButtonProps;

    // Visual variant (controls text colors)
    variant?: SideBarVariant;
}

/**
 * CommonHeaderSideBar
 *
 * A reusable sidebar header with logo, title, subtitle, and optional dropdown arrow.
 * Supports dark and light variants.
 *
 * @example
 * <CommonHeaderSideBar
 *   logo={<img src={logo} alt="logo" />}
 *   title="EGEMCO HRIS"
 *   subtitle="Super User Access"
 *   variant="dark"
 *   hasArrow
 *   onArrowClick={() => {}}
 * />
 */
export default function CommonHeaderSideBar({
    buttonProps,
    className,
    hasArrow,
    isExpanded = true,
    logo,
    subtitle,
    title,
    variant = 'dark',
    ...props
}: CommonHeaderSideBarProps) {
    const headerVariantStyles = {
        dark: {
            titleColor: 'text-white',
            subtitleColor: 'text-white/60'
        },
        light: {
            titleColor: 'text-[var(--mui-tokens-color-neutral-900)]',
            subtitleColor: 'text-[var(--mui-tokens-color-neutral-500)]'
        }
    };
    const headerStyle = headerVariantStyles[variant];

    return (
        <div
            className={
                classMerge(
                    'flex items-center gap-[var(--mui-tokens-spacing-4)] whitespace-nowrap px-[var(--mui-tokens-spacing-6)] py-[var(--mui-tokens-spacing-7)]',
                    className
                )}
            {...props}
        >
            {logo}
            <div className="min-w-0 flex-1">
                <p
                    className={
                        classMerge(
                            'text-[length:var(--mui-tokens-fontSize-nm)] font-[var(--mui-tokens-fontWeight-bold)] leading-[1.25rem]',
                            headerStyle.titleColor
                        )}
                >
                    {title}
                </p>
                {subtitle && (
                    <p
                        className={
                            classMerge(
                                'text-[12px] leading-snug',
                                headerStyle.subtitleColor
                            )
                        }
                    >
                        {subtitle}
                    </p>
                )}
            </div>
            {hasArrow && (
                <IconButton
                    disableRipple
                    {...buttonProps}
                    sx={{
                        flexShrink: 0,
                        p: 0,
                        ...buttonProps?.sx
                    }}
                >
                    <CaretRight
                        className={classMerge(
                            'transition-transform duration-200',
                            isExpanded && 'rotate-90'
                        )}
                        color="#022179"
                        size={12}
                        weight="bold"
                    />
                </IconButton>
            )}
        </div>
    );
}
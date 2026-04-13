import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import { CaretRight } from '@phosphor-icons/react';
import { DivProps, ThemeSx } from '@type/common.type';
import { SideBarVariant } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme-util';
import { ReactNode } from 'react';

export interface CommonHeaderSideBarProps extends DivProps {
    // Props spread onto the arrow IconButton
    buttonProps?: IconButtonProps;

    // Whether to show the dropdown arrow icon
    hasArrow?: boolean;

    // Whether the arrow is in expanded (down) state
    isExpanded?: boolean;

    // Logo element displayed in the header
    logo?: ReactNode;

    // Subtitle text displayed below the title
    subtitle?: string;

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
            titleColor: 'text-[var(--mui-tokens-color-common-white)]',
            subtitleColor: 'text-[#ffffff99]'
        },
        light: {
            titleColor: 'text-[var(--mui-tokens-color-neutral-900)]',
            subtitleColor: 'text-[var(--mui-tokens-color-neutral-500)]'
        }
    }; // Predefined styles for dark and light variants
    const { titleColor, subtitleColor } = headerVariantStyles[variant]; // Destructure styles based on the current variant
    const arrowRotateClass = isExpanded && 'rotate-90'; // Rotate arrow if expanded

    return (
        <div
            className={
                classMerge(
                    'flex items-center gap-[var(--mui-tokens-spacing-4)] whitespace-nowrap px-[var(--mui-tokens-spacing-6)] py-[var(--mui-tokens-spacing-7)]',
                    className
                )
            }
            {...props}
        >
            {logo}
            <div className="min-w-0 flex-1">
                <p
                    className={
                        classMerge(
                            'text-[length:var(--mui-tokens-fontSize-nm)] font-[var(--mui-tokens-fontWeight-bold)] leading-[1.25rem]',
                            titleColor
                        )
                    }
                >
                    {title}
                </p>
                {subtitle && (
                    <p
                        className={
                            classMerge(
                                'text-[12px] leading-snug',
                                subtitleColor
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
                    sx={[
                        {
                            flexShrink: 0,
                            p: 0
                        },
                        ...normalizeSx(buttonProps?.sx as ThemeSx)
                    ]}
                >
                    <CaretRight
                        className={
                            classMerge(
                                'transition-transform duration-200',
                                arrowRotateClass
                            )
                        }
                        color="#022179"
                        size={12}
                        weight="bold"
                    />
                </IconButton>
            )}
        </div>
    );
}
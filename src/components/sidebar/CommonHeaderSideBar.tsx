import ArrowIconDown from '@components/icons/ArrowIconDown';
import CommonHeaderSubtitle from '@components/sidebar/CommonHeaderSubtitle';
import { CommonHeaderTitle } from '@components/sidebar/CommonHeaderTitle';
import { IconButtonProps } from '@mui/material/IconButton';
import { HTMLAttributesDivElement } from '@type/common.type';
import { SideBarVariant } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface CommonHeaderSideBarProps extends HTMLAttributesDivElement {
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
            subtitleColor: 'text-[var(--mui-tokens-color-common-white)]'
        },
        light: {
            titleColor: 'text-[var(--mui-tokens-color-neutral-900)]',
            subtitleColor: 'text-[var(--mui-tokens-color-neutral-500)]'
        }
    }; // Predefined styles for dark and light variants
    const { titleColor, subtitleColor } = headerVariantStyles[variant]; // Destructure styles based on the current variant

    return (
        <div
            className={
                classMerge(
                    'flex items-center gap-(--mui-tokens-spacing-4) whitespace-nowrap px-(--mui-tokens-spacing-6) py-(--mui-tokens-spacing-7)',
                    className
                )
            }
            {...props}
        >
            {logo}
            <div className="flex-1 min-w-0">
                <CommonHeaderTitle
                    colorClassName={titleColor}
                    text={title}
                />
                {subtitle && <CommonHeaderSubtitle
                    colorClassName={subtitleColor}
                    text={subtitle}
                />}
            </div>
            {hasArrow && <ArrowIconDown
                buttonProps={buttonProps}
                isExpanded={isExpanded}
            />}
        </div>
    );
}
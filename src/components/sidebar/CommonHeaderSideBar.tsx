import ArrowIconDown from '@components/icons/ArrowIconDown';
import CommonHeaderSubtitle from '@components/sidebar/CommonHeaderSubtitle';
import { CommonHeaderTitle } from '@components/sidebar/CommonHeaderTitle';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { PushPinIcon, PushPinSlashIcon } from '@phosphor-icons/react';
import { HTMLAttributesDivElement } from '@type/common.type';
import { SideBarVariant } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface CommonHeaderSideBarProps extends HTMLAttributesDivElement {
    buttonProps?: IconButtonProps;

    hasArrow?: boolean;

    isExpanded?: boolean;

    isLocked?: boolean;

    logo?: ReactNode;

    subtitle?: string;

    variant?: SideBarVariant;

    onToggleLock?: VoidFunction;
}

/**
 * CommonHeaderSideBar
 *
 * A reusable sidebar header with logo, title, subtitle, and a lock button that
 * pins the sidebar open. Collapses to a centred logo mark when the sidebar is
 * rendered as an icon rail. Supports dark and light variants.
 *
 * @example
 * <CommonHeaderSideBar
 *   isExpanded
 *   isLocked={false}
 *   subtitle="Super User Access"
 *   title="AU-JAS LMS"
 *   variant="dark"
 *   onToggleLock={() => {}}
 * />
 */
export default function CommonHeaderSideBar({
    buttonProps,
    className,
    hasArrow,
    isExpanded = true,
    isLocked = false,
    logo,
    subtitle,
    title,
    variant = 'dark',
    onToggleLock,
    ...props
}: CommonHeaderSideBarProps) {
    const headerVariantStyles = {
        dark: {
            titleColor: 'text-[var(--mui-tokens-color-common-white)]',
            subtitleColor: 'text-[var(--mui-tokens-color-common-white)]',
            markColor: 'bg-white/10 text-[var(--mui-tokens-color-common-white)]',
            lockColor: 'text-[var(--mui-tokens-color-common-white)] hover:bg-white/10'
        },
        light: {
            titleColor: 'text-[var(--mui-tokens-color-neutral-900)]',
            subtitleColor: 'text-[var(--mui-tokens-color-neutral-500)]',
            markColor: 'bg-[var(--mui-tokens-color-neutral-100)] text-[var(--mui-tokens-color-neutral-900)]',
            lockColor: 'text-[var(--mui-tokens-color-neutral-600)] hover:bg-[var(--mui-tokens-color-neutral-100)]'
        }
    };
    const {
        lockColor,
        markColor,
        subtitleColor,
        titleColor
    } = headerVariantStyles[variant];

    const logoMark = logo ?? (
        <span
            className={
                classMerge(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-(--mui-tokens-radius-md) text-(length:--mui-tokens-fontSize-sm) font-(--mui-tokens-fontWeight-bold)',
                    markColor
                )
            }
        >
            {title?.trim()
                .charAt(0) ?? 'A'}
        </span>
    );

    return (
        <div
            className={
                classMerge(
                    'flex shrink-0 items-center gap-(--mui-tokens-spacing-4) whitespace-nowrap py-(--mui-tokens-spacing-7)',
                    isExpanded
                        ? 'px-(--mui-tokens-spacing-6)'
                        : 'justify-center px-(--mui-tokens-spacing-2)',
                    className
                )
            }
            {...props}
        >
            {logoMark}
            {isExpanded && (
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
            )}
            {isExpanded && onToggleLock && (
                <Tooltip
                    placement="right"
                    title={
                        isLocked
                            ? 'Unpin sidebar'
                            : 'Pin sidebar open'
                    }
                >
                    <IconButton
                        className={
                            classMerge(
                                'shrink-0',
                                lockColor
                            )
                        }
                        size="small"
                        onClick={onToggleLock}
                    >
                        {isLocked
                            ? <PushPinIcon
                                size={18}
                                weight="fill"
                            />
                            : <PushPinSlashIcon size={18} />}
                    </IconButton>
                </Tooltip>
            )}
            {hasArrow && <ArrowIconDown
                buttonProps={buttonProps}
                isExpanded={isExpanded}
            />}
        </div>
    );
}
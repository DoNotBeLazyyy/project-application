import useBreakpoint from '@hooks/useBreakpoint';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Tooltip, { TooltipProps } from '@mui/material/Tooltip';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { KeyboardEventButtonElement } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { ReactNode, useEffect, useState } from 'react';

export type CommonInfoTooltipVariant = 'info' | 'error';

export interface CommonInfoTooltipProps {
    // The explanatory copy revealed by the icon
    content: ReactNode;

    // Additional class name for the trigger button
    className?: string;

    /**
     * Whether the tooltip is open by default (e.g. for first invalid field)
     */
    defaultOpen?: boolean;

    /**
     * Controlled open state
     */
    isOpen?: boolean;

    // Accessible name for the trigger; defaults to a generic description label
    label?: string;

    // Tooltip placement relative to the icon
    placement?: TooltipProps['placement'];

    // Icon size in pixels
    size?: number;

    /**
     * `info` explains, `error` warns. The error variant carries the danger icon
     * and colour so a field's problem is visible before the copy is opened.
     */
    variant?: CommonInfoTooltipVariant;
}

const VARIANT_STYLES = {
    info: {
        background: 'var(--mui-tokens-color-neutral-800)',
        icon: InfoIcon,
        idleClassName: 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-primary-main)',
        openClassName: 'text-(--mui-palette-primary-main)'
    },
    error: {
        background: 'var(--mui-palette-error-main)',
        icon: WarningCircleIcon,
        idleClassName: 'text-(--mui-palette-error-main) hover:text-(--mui-palette-error-dark)',
        openClassName: 'text-(--mui-palette-error-dark)'
    }
} as const;

/**
 * CommonInfoTooltip
 *
 * An info affordance for page and card headers: it moves long explanatory copy
 * out of a subheader and behind an icon, keeping dense screens readable.
 *
 * It opens on hover for pointers that support it, and on click everywhere -
 * touch devices have no hover, so the click path is the only way a phone user
 * can reach the copy. A click also pins the bubble open so it survives the
 * pointer leaving, and it closes on click-away or Escape.
 *
 * @example
 * <CommonInfoTooltip content="Enter the minimum % for each grade." />
 */
export default function CommonInfoTooltip({
    className,
    content,
    defaultOpen = false,
    isOpen: controlledIsOpen,
    label = 'More information',
    placement = 'bottom-start',
    size = 18,
    variant = 'info'
}: CommonInfoTooltipProps) {
    const { hasHover } = useBreakpoint();
    const [isPinned, setIsPinned] = useState(defaultOpen);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (defaultOpen) {
            setIsPinned(true);
        }
    }, [defaultOpen, content]);

    const isOpen = controlledIsOpen ?? (isPinned || isHovered);
    const {
        background,
        icon: Icon,
        idleClassName,
        openClassName
    } = VARIANT_STYLES[variant];

    function handleToggle() {
        setIsPinned(function(previous) {
            return !previous;
        });
    }

    function handleClickAway() {
        setIsPinned(false);
        setIsHovered(false);
    }

    function handleKeyDown(event: KeyboardEventButtonElement) {
        if (event.key === 'Escape') {
            handleClickAway();
        }
    }

    function handleMouseEnter() {
        if (hasHover) {
            setIsHovered(true);
        }
    }

    function handleMouseLeave() {
        setIsHovered(false);
    }

    return (
        <ClickAwayListener onClickAway={handleClickAway}>
            <Tooltip
                disableFocusListener
                disableHoverListener
                disableTouchListener
                open={isOpen}
                placement={placement}
                slotProps={{
                    tooltip: {
                        sx: {
                            backgroundColor: background,
                            borderRadius: 'var(--mui-tokens-radius-md)',
                            fontSize: 'var(--mui-tokens-fontSize-xs)',
                            fontWeight: 'var(--mui-tokens-fontWeight-normal)',
                            lineHeight: 1.5,
                            maxWidth: '20rem',
                            padding: 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-5)'
                        }
                    }
                }}
                title={content}
            >
                <button
                    aria-expanded={isOpen}
                    aria-label={label}
                    className={
                        classMerge(
                            'cursor-pointer inline-flex items-center justify-center rounded-full shrink-0 transition-colors',
                            idleClassName,
                            isOpen && openClassName,
                            className
                        )
                    }
                    type="button"
                    onBlur={handleMouseLeave}
                    onClick={handleToggle}
                    onFocus={handleMouseEnter}
                    onKeyDown={handleKeyDown}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <Icon size={size} weight="fill" />
                </button>
            </Tooltip>
        </ClickAwayListener>
    );
}
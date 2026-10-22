import useBreakpoint from '@hooks/useBreakpoint';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Tooltip, { TooltipProps } from '@mui/material/Tooltip';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { KeyboardEventButtonElement } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { FORM_ERROR_EVENT, FormErrorEventDetail } from '@utils/form.util';
import { ReactNode, useEffect, useRef, useState } from 'react';

export type CommonInfoTooltipVariant = 'info' | 'error';

export interface CommonInfoTooltipProps {
    // The explanatory copy revealed by the icon
    content: ReactNode;

    // Additional class name for the trigger button
    className?: string;

    /**
     * Whether the tooltip should automatically open when a form error occurs
     */
    autoOpenOnError?: boolean;

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
    autoOpenOnError = true,
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
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isPinned, setIsPinned] = useState(defaultOpen);
    const [isHovered, setIsHovered] = useState(false);
    const pinnedAtRef = useRef<number>(defaultOpen
        ? Date.now()
        : 0);

    useEffect(() => {
        if (defaultOpen) {
            pinnedAtRef.current = Date.now();
            setIsPinned(true);
        }
        else {
            setIsPinned(false);
        }
    }, [defaultOpen, content]);

    useEffect(() => {
        if (variant !== 'error' || !content || !autoOpenOnError) {
            return;
        }

        const button = buttonRef.current;
        if (!button) {
            return;
        }

        const container = button.closest('.flex-col, .MuiFormControl-root, .common_input_container') || button.parentElement;
        if (!container) {
            return;
        }

        const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
        if (activeEl && (container.contains(activeEl) || container === activeEl)) {
            pinnedAtRef.current = Date.now();
            setIsPinned(true);
        }

        function handleFocusIn(event: Event) {
            if (event.target !== button) {
                pinnedAtRef.current = Date.now();
                setIsPinned(true);
            }
        }

        container.addEventListener('focusin', handleFocusIn);
        return () => {
            container.removeEventListener('focusin', handleFocusIn);
        };
    }, [variant, content, autoOpenOnError]);

    useEffect(() => {
        function handleFormError(event: Event) {
            if (!autoOpenOnError) {
                return;
            }
            const detail = (event as CustomEvent<FormErrorEventDetail>)?.detail;
            if (defaultOpen && content) {
                pinnedAtRef.current = Date.now();
                setIsPinned(true);
                return;
            }
            if (variant === 'error' && detail?.firstErrorField && buttonRef.current && content) {
                const container = buttonRef.current.closest('.flex-col, .MuiFormControl-root, .common_input_container') || buttonRef.current.parentElement;
                if (container) {
                    const errorField = detail.firstErrorField;
                    const altField = errorField === 'description' ? 'content' : (errorField === 'content' ? 'description' : undefined);
                    const escaped = errorField.replace(/\./g, '\\.');
                    const isDirectMatch = Boolean(
                        container.getAttribute('data-field-name')?.split(/\s+/).includes(errorField) ||
                        (altField && container.getAttribute('data-field-name')?.split(/\s+/).includes(altField)) ||
                        container.getAttribute('name') === errorField ||
                        container.id === errorField ||
                        (altField && (container.getAttribute('name') === altField || container.id === altField))
                    );
                    let matchedInput: Element | null = null;
                    if (isDirectMatch) {
                        matchedInput = container;
                    } else {
                        try {
                            matchedInput = container.querySelector(
                                `[name="${errorField}"], [id="${errorField}"], [data-field-name~="${errorField}"], [data-field-name="${errorField}"], [name="${escaped}"], #${escaped}` +
                                (altField ? `, [name="${altField}"], [id="${altField}"], [data-field-name~="${altField}"], [data-field-name="${altField}"]` : '')
                            );
                        } catch {
                            matchedInput = container.querySelector(`[name="${errorField}"]`);
                        }
                    }
                    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
                    if (matchedInput || (activeEl && container.contains(activeEl))) {
                        pinnedAtRef.current = Date.now();
                        setIsPinned(true);
                    }
                }
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener(FORM_ERROR_EVENT, handleFormError);
            return () => {
                window.removeEventListener(FORM_ERROR_EVENT, handleFormError);
            };
        }
    }, [autoOpenOnError, defaultOpen, content, variant]);

    const isOpen = controlledIsOpen ?? (isPinned || isHovered);
    const {
        background,
        icon: Icon,
        idleClassName,
        openClassName
    } = VARIANT_STYLES[variant];

    function handleToggle() {
        setIsPinned(function(previous) {
            if (!previous) {
                pinnedAtRef.current = Date.now();
            }
            return !previous;
        });
    }

    function handleClickAway(event: MouseEvent | TouchEvent) {
        // Prevent dismissal from clicks that happened around the time of pinning (e.g. submit button click)
        if (Date.now() - pinnedAtRef.current < 600) {
            return;
        }

        // For error tooltips, do not close when the user interacts with the input, dropdown menu, or datepicker
        if (variant === 'error' && buttonRef.current) {
            if (event.target instanceof Node) {
                const fieldContainer = buttonRef.current.closest('.flex-col, .MuiFormControl-root, .common_input_container') || buttonRef.current.parentElement || buttonRef.current.closest('div');
                if (fieldContainer && fieldContainer.contains(event.target)) {
                    return;
                }
            }
            if (event.target instanceof Element) {
                if (event.target.closest('.MuiPopover-root, .MuiMenu-root, .MuiPickersPopper-root, .MuiAutocomplete-popper, .MuiDialog-root, .toastui-editor')) {
                    return;
                }
            }
            if (defaultOpen) {
                return;
            }
        }

        setIsPinned(false);
        setIsHovered(false);
    }

    function handleKeyDown(event: KeyboardEventButtonElement) {
        if (event.key === 'Escape') {
            setIsPinned(false);
            setIsHovered(false);
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
                            'cursor-pointer inline-flex items-center justify-center rounded-full shrink-0 transition-colors align-middle',
                            idleClassName,
                            isOpen && openClassName,
                            className
                        )
                    }
                    ref={buttonRef}
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
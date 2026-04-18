import { CommonInputProps } from '@components/input/CommonInput';
import { TextField } from '@mui/material';
import { NotchesIcon } from '@phosphor-icons/react';
import { ThemeSx } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';
import {
    CSSProperties, forwardRef, useEffect, useMemo, useRef, useState
} from 'react';

type ResizeMode = 'none' | 'horizontal' | 'vertical' | 'both';

type CommonTextareaProps = CommonInputProps & {
    // Whether there's a text counter or not
    hasTextCount?: boolean;

    // Max text length
    maxLength?: number;

    // Resize behavior
    resize?: ResizeMode;
};

interface ResizeMetadata {
    allowHeightResize: boolean;
    allowWidthResize: boolean;
    cursor: CSSProperties['cursor'];
}

const TEXTAREA_MIN_SIZE = {
    pagination: {
        minHeight: 134,
        minWidth: 272
    },
    xsmall: {
        minHeight: 134,
        minWidth: 272
    },
    small: {
        minHeight: 134,
        minWidth: 272
    },
    medium: {
        minHeight: 134,
        minWidth: 272
    },
    large: {
        minHeight: 170,
        minWidth: 264
    },
    xlarge: {
        minHeight: 134,
        minWidth: 272
    }
} as const;

/**
 * CommonTextarea
 *
 * A specialized multiline text input built on top of StyledTextField.
 * The theme owns the textarea shell and spacing, while this component
 * owns the custom footer behavior such as text count, resize handle,
 * and drag resizing.
 *
 * Sizing is controlled only through minHeight and minWidth so the
 * component has a single source of truth and avoids row-based sizing bugs.
 *
 * @example
 * <CommonTextarea
 *     hasTextCount
 *     maxLength={500}
 *     placeholder="Enter your description..."
 *     resize="both"
 * />
 */
const CommonTextarea = forwardRef<HTMLDivElement, CommonTextareaProps>(({
    hasTextCount = false,
    size = 'large',
    variant = 'outlined',
    maxLength,
    resize = 'none',
    slotProps,
    sx,
    value,
    onChange,
    ...props
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragDataRef = useRef({
        startHeight: 0,
        startWidth: 0,
        startX: 0,
        startY: 0
    });
    const [charCount, setCharCount] = useState(String(value ?? '').length);

    useEffect(() => {
        setCharCount(String(value ?? '').length);
    }, [value]);

    const resizeMeta = useMemo<ResizeMetadata>(() => {
        switch (resize) {
        case 'horizontal':
            return {
                allowHeightResize: false,
                allowWidthResize: true,
                cursor: 'ew-resize'
            };
        case 'vertical':
            return {
                allowHeightResize: true,
                allowWidthResize: false,
                cursor: 'ns-resize'
            };
        case 'both':
            return {
                allowHeightResize: true,
                allowWidthResize: true,
                cursor: 'nwse-resize'
            };
        case 'none':
        default:
            return {
                allowHeightResize: false,
                allowWidthResize: false,
                cursor: 'default'
            };
        }
    }, [resize]);

    const resolvedMinSize = TEXTAREA_MIN_SIZE[size];
    const hasResize = resize !== 'none';
    const isFullWidth = !resizeMeta.allowWidthResize;
    const footerInsetStyle = size === 'large'
        ? {
            bottom: '12px',
            left: '16px',
            right: '12px'
        }
        : {
            bottom: '8px',
            left: '12px',
            right: '8px'
        };

    const iconSize = size === 'large'
        ? 16
        : 14;

    /**
     * Initializes the resize drag operation.
     *
     * @param event - The mouse event from the resize handle.
     * @returns
     */
    function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
        if (!hasResize || !containerRef.current) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const rect = containerRef.current.getBoundingClientRect();

        dragDataRef.current = {
            startHeight: rect.height,
            startWidth: rect.width,
            startX: event.clientX,
            startY: event.clientY
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Updates container dimensions based on current mouse position.
     *
     * @param event - Native mouse event from the document.
     * @returns
     */
    function handleMouseMove(event: MouseEvent) {
        if (!containerRef.current) {
            return;
        }

        const parent = containerRef.current.parentElement;
        const { startHeight, startWidth, startX, startY } = dragDataRef.current;
        const nextWidth = startWidth + (event.clientX - startX);
        const nextHeight = startHeight + (event.clientY - startY);

        if (resizeMeta.allowWidthResize) {
            const maxWidth = parent?.getBoundingClientRect().width ?? nextWidth;
            containerRef.current.style.width = `${Math.min(Math.max(resolvedMinSize.minWidth, nextWidth), maxWidth)}px`;
        }
        if (resizeMeta.allowHeightResize) {
            const maxHeight = parent?.getBoundingClientRect().height ?? nextHeight;
            containerRef.current.style.height = `${Math.min(Math.max(resolvedMinSize.minHeight, nextHeight), maxHeight)}px`;
        }
    }

    /**
     * Cleans up global resize listeners.
     *
     * @returns
     */
    function handleMouseUp() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    /**
     * Syncs character count and propagates the change event.
     *
     * @param event - React change event from the textarea.
     * @returns
     */
    function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setCharCount(event.target.value.length);
        onChange?.(event);
    }

    const baseStyle: ThemeSx = {
        height: '100%',
        minHeight: `${resolvedMinSize.minHeight}px`,
        minWidth: `${resolvedMinSize.minWidth}px`,
        width: '100%',
        '& .MuiFormHelperText-root': {
            marginLeft: 0,
            marginRight: 0
        },
        '& .MuiInputBase-root': {
            height: '100%',
            minHeight: `${resolvedMinSize.minHeight}px`,
            minWidth: `${resolvedMinSize.minWidth}px`,
            width: '100%'
        },
        '& .common_textarea_html_input': {
            height: '100%',
            minHeight: `${resolvedMinSize.minHeight}px`
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: 'auto',
                maxHeight: '100%',
                maxWidth: '100%',
                minHeight: `${resolvedMinSize.minHeight}px`,
                minWidth: `${resolvedMinSize.minWidth}px`,
                position: 'relative',
                width: isFullWidth
                    ? '100%'
                    : `${resolvedMinSize.minWidth}px`
            }}
        >
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%'
                }}
            >
                <TextField
                    fullWidth
                    multiline
                    ref={ref}
                    size={size}
                    slotProps={{
                        ...slotProps,
                        input: {
                            ...slotProps?.input,
                            className: classMerge(
                                'common_textarea_input'
                            ),
                            inputComponent: 'textarea'
                        },
                        htmlInput: {
                            ...slotProps?.htmlInput,
                            className: classMerge(
                                'common_textarea_html_input'
                            ),
                            maxLength
                        }
                    }}
                    sx={[
                        baseStyle,
                        ...normalizeSx(sx)
                    ]}
                    value={value}
                    variant={variant}
                    onChange={handleChange}
                    {...props}
                />
            </div>
            {(hasTextCount || hasResize) && (
                <div
                    style={{
                        alignItems: 'flex-end',
                        display: 'flex',
                        pointerEvents: 'none',
                        position: 'absolute',
                        ...footerInsetStyle
                    }}
                >
                    {hasTextCount && (
                        <div
                            style={{
                                color: 'var(--mui-tokens-color-neutral-500)',
                                fontSize: 'var(--mui-tokens-font-size-xs)',
                                lineHeight: '100%',
                                pointerEvents: 'none'
                            }}
                        >
                            <span>{charCount}</span>
                            {maxLength
                                ? <span> / {maxLength}</span>
                                : null}
                        </div>
                    )}
                    {hasResize && (
                        <div
                            style={{
                                color: 'var(--mui-tokens-color-neutral-500)',
                                cursor: resizeMeta.cursor,
                                display: 'flex',
                                marginLeft: 'auto',
                                pointerEvents: 'auto'
                            }}
                            onMouseDown={handleMouseDown}
                        >
                            <NotchesIcon
                                size={iconSize}
                                weight="regular"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
CommonTextarea.displayName = 'CommonTextarea';

export default CommonTextarea;
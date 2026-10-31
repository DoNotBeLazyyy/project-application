import Button, { ButtonProps } from '@mui/material/Button';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';
import {
    ReactNode, forwardRef, useEffect, useRef, useState
} from 'react';

export interface CommonButtonProps extends ButtonProps {
    // Loading icon
    loadingIcon?: ReactNode;
}

/**
 * CommonButton
 *
 * A customizable MUI button component with predefined size and variant styles.
 * Use only one icon position at a time. Provide either `startIcon` or `endIcon`,
 * but do not use both simultaneously. Design tokens are computed natively via the theme.
 *
 * Pass `loading` to disable the button and swap its icon for a spinner while the action
 * it triggers is in flight. This is opt-in per button — it is never derived from the
 * global loading state, so an unrelated request can never disable the whole screen.
 *
 * @example
 * <CommonButton
 *  size="xsmall"
 *  startIcon={<PlusIcon />}
 * >
 *  Primary
 * </CommonButton>
 */
const CommonButton = forwardRef<HTMLButtonElement, CommonButtonProps>(({
    className,
    disabled,
    endIcon,
    loading,
    loadingIcon,
    startIcon,
    ...props
}, ref) => {
    const isHandlingRef = useRef(false);
    const isMountedRef = useRef(true);
    const [asyncLoading, setAsyncLoading] = useState(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const isLoading = loading !== undefined
        ? loading === true
        : asyncLoading; // Per-button loading state flag
    const isDisabled = Boolean(disabled) || isLoading; // Disable when explicitly disabled or loading
    const spinner = loadingIcon ?? <CircleNotchIcon className="animate-spin" />;

    const resolvedStartIcon = isLoading
        ? (endIcon && !startIcon
            ? null
            : spinner)
        : (startIcon ?? null);

    const resolvedEndIcon = isLoading
        ? (endIcon && !startIcon
            ? spinner
            : null)
        : (startIcon
            ? null
            : (endIcon ?? null));

    async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (isDisabled || isHandlingRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (props.onClick) {
            try {
                const result: unknown = props.onClick(event);
                if (typeof result === 'object' && result !== null && 'then' in result && typeof result.then === 'function') {
                    isHandlingRef.current = true;
                    if (loading === undefined) {
                        setAsyncLoading(true);
                    }
                    await result;
                }
            }
            finally {
                isHandlingRef.current = false;
                if (isMountedRef.current && loading === undefined) {
                    setAsyncLoading(false);
                }
            }
        }
    }

    return (
        <Button
            className={
                classMerge(
                    className,
                    isLoading && 'is_loading'
                )
            }
            disabled={isDisabled}
            endIcon={resolvedEndIcon}
            ref={ref}
            startIcon={resolvedStartIcon}
            {...props}
            onClick={handleClick}
        />
    );
});
CommonButton.displayName = 'CommonButton';

export default CommonButton;
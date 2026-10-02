import Button, { ButtonProps } from '@mui/material/Button';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';
import { ReactNode, forwardRef } from 'react';

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
    const isLoading = loading === true; // Per-button loading state flag
    const isDisabled = disabled || isLoading; // Disable when explicitly disabled or loading
    const spinner = loadingIcon ?? <CircleNotchIcon className="animate-spin" />;

    const resolvedStartIcon = isLoading
        ? (endIcon && !startIcon ? null : spinner)
        : (startIcon ?? null);

    const resolvedEndIcon = isLoading
        ? (endIcon && !startIcon ? spinner : null)
        : (startIcon ? null : (endIcon ?? null));

    return <Button
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
    />;
});
CommonButton.displayName = 'CommonButton';

export default CommonButton;
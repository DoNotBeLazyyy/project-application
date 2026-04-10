import Button, { ButtonProps } from '@mui/material/Button';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { useLoadingStore } from '@stores/loading.store';
import { classMerge } from '@utils/css.util';
import { ReactNode, forwardRef } from 'react';

export interface CommonButtonProps extends ButtonProps {
    // Button label
    label?: string;

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
    loadingIcon,
    startIcon,
    ...props
}, ref) => {
    const { isLoading } = useLoadingStore(); // Global loading state flag
    const isDisabled = disabled || isLoading; // Disable when explicitly disabled or loading
    const resolvedStartIcon = resolveIcon(startIcon); // Computed start icon element
    const resolvedEndIcon = startIcon
        ? null
        : resolveIcon(endIcon); // Only resolve end icon when no start icon is present
    const loadingClassName = isLoading && 'is_loading'; // Classname when loading is true

    /**
     * Resolves the icon to display based on the loading state.
     *
     * @param icon - The original icon to render.
     * @returns
     */
    function resolveIcon(icon?: ReactNode) {
        if (!icon) {
            return null;
        }

        return isLoading
            ? loadingIcon ?? <CircleNotchIcon className="animate-spin" />
            : icon;
    }

    return <Button
        className={
            classMerge(
                className,
                loadingClassName
            )
        }
        disabled={isDisabled}
        endIcon={resolvedEndIcon}
        ref={ref}
        startIcon={resolvedStartIcon}
        {...props} />;
});
CommonButton.displayName = 'CommonButton';

export default CommonButton;
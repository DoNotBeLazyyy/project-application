import { IconProps, XIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';

/**
 * ModalCloseIcon
 *
 * A standardized close icon (XIcon) used within modal headers. It provides a
 * consistent scale, padding, and brand color while allowing for property overrides.
 *
 * @example
 * <ModalCloseIcon
 *  className="opacity-50"
 *  onClick={handleClose}
 * />
 */
export default function ModalCloseIcon(props: IconProps) {
    const resolvedClassName = classMerge(
        'cursor-pointer h-[2.25rem] p-[var(--mui-tokens-spacing-3)] text-[var(--mui-tokens-color-brand-900)] w-[2.25rem]',
        props.className
    ); // Resolved styling for the action icon

    return (
        <XIcon
            className={resolvedClassName}
            weight="bold"
            {...props}
        />
    );
}
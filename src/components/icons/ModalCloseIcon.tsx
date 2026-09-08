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
    return <XIcon
        weight="bold"
        {...props}
        className={
            classMerge(
                'cursor-pointer h-9 hover:bg-slate-100 p-(--mui-tokens-spacing-3) rounded-full shrink-0 text-(--mui-tokens-color-brand-900) transition-colors w-9',
                props.className
            )
        }
    />;
}
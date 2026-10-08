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
export interface ModalCloseIconProps extends Omit<IconProps, 'onClick'> {
    onClick?: React.MouseEventHandler<any>;
}

export default function ModalCloseIcon({ className, onClick, ...props }: ModalCloseIconProps) {
    return (
        <button
            aria-label="Close"
            className={
                classMerge(
                    'cursor-pointer h-9 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full shrink-0 text-(--mui-tokens-color-brand-900) dark:text-slate-200 transition-colors w-9 flex items-center justify-center p-0 border-0 bg-transparent',
                    className
                )
            }
            type="button"
            onClick={onClick}
        >
            <XIcon
                weight="bold"
                size={18}
                {...props}
            />
        </button>
    );
}
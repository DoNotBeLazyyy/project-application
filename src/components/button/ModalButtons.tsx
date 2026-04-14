import CommonButton, { CommonButtonProps } from '@components/button/CommonButton';
import { classMerge } from '@utils/css.util';

export interface ModalButtonProps {
    // Additional class name
    className?: string;

    // Delete button props
    cancelProps?: CommonButtonProps;

    // Confirm button props
    confirmProps?: CommonButtonProps;

    // Determines whether buttons are full width or not
    isButtonsFullWidth?: boolean;
}

/**
 * ModalButtons
 *
 * A layout component that groups the action buttons for modals, ensuring
 * a single JSX return by pre-resolving conditional button elements into variables.
 *
 * @example
 * <ModalButtons
 *  cancelProps={{ children: 'No' }}
 *  confirmProps={{ children: 'Yes' }}
 * />
 */
export default function ModalButtons({
    cancelProps,
    className,
    confirmProps,
    isButtonsFullWidth
}: ModalButtonProps) {
    const resolvedClassName = classMerge(
        'flex gap-(--mui-tokens-spacing-5) justify-center',
        className
    ); // Resolved container class names
    const commonProps = {
        fullWidth: isButtonsFullWidth,
        size: 'small' as const
    }; // Common props

    return (
        <div className={resolvedClassName}>
            {cancelProps && (
                <CommonButton
                    {...commonProps}
                    {...cancelProps}
                />
            )}
            {confirmProps && (
                <CommonButton
                    {...commonProps}
                    {...confirmProps}
                />
            )}
        </div>
    );
}
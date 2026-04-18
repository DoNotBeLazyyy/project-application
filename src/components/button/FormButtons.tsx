import CommonButton, { CommonButtonProps } from '@components/button/CommonButton';
import { classMerge } from '@utils/css.util';

export interface FormButtonsProps {
    // Delete button props
    cancelProps?: CommonButtonProps;

    // Additional class name
    className?: string;

    // Confirm button props
    confirmProps?: CommonButtonProps;

    // Determines whether buttons are full width or not
    isButtonsFullWidth?: boolean;
}

/**
 * FormButtons
 *
 * A layout component that groups the action buttons for modals, ensuring
 * standardized spacing and responsive width handling.
 *
 * @example
 * <FormButtons
 *  cancelProps={{ children: 'No' }}
 *  confirmProps={{ children: 'Yes' }}
 * />
 */
export default function FormButtons({
    cancelProps,
    className,
    confirmProps,
    isButtonsFullWidth
}: FormButtonsProps) {
    const commonProps = {
        fullWidth: isButtonsFullWidth,
        size: 'small' as const
    }; // Common props for buttons

    return (
        <div
            className={
                classMerge(
                    'flex gap-(--mui-tokens-spacing-5) justify-center',
                    className
                )
            }
        >
            {cancelProps && <CommonButton
                {...commonProps}
                {...cancelProps}
            />}
            {confirmProps && <CommonButton
                {...commonProps}
                {...confirmProps}
            />}
        </div>
    );
}
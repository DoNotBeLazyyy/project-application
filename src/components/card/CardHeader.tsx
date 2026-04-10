import ModalCloseIcon from '@components/icons/ModalCloseIcon';
import { CardHeader, CardHeaderProps } from '@mui/material';
import { IconProps } from '@phosphor-icons/react';

export type CommonCardHeaderProps = CardHeaderProps & {
    // Props for the default action icon; if omitted, no default action renders
    defaultActionProps?: IconProps;
};

/**
 * CommonCardHeader
 *
 * A specialized wrapper for the MUI CardHeader. It renders a ModalCloseIcon
 * in the action slot only if defaultActionProps are provided, or if a custom
 * action is passed.
 *
 * @example
 * <CommonCardHeader
 *  title="Delete Record"
 *  defaultActionProps={{ onClick: handleClose }}
 * />
 */
export default function CommonCardHeader({
    action,
    defaultActionProps,
    ...props
}: CommonCardHeaderProps) {
    const resolvedAction = action ?? defaultActionProps
        ? <ModalCloseIcon {...defaultActionProps} />
        : null; // Resolved action slot
    const resolvedProps = {
        ...props,
        action: resolvedAction
    }; // Merged MUI props

    return <CardHeader {...resolvedProps} />;
}
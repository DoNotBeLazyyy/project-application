import CommonCard, { CommonCardProps } from '@components/card/CommonCard';
import useBreakpoint from '@hooks/useBreakpoint';
import Dialog, { DialogOwnerState, DialogProps } from '@mui/material/Dialog';
import { PaperProps } from '@mui/material/Paper';
import { DialogCloseProps } from '@type/common/theme.type';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';

export interface CommonModalProps extends DialogProps {
    // Props explicitly intended for the injected CommonCard component
    cardProps?: CommonCardProps;

    // Determines if clicking the dark backdrop should trigger onClose
    closeOnBackdropClick?: boolean;

    // Determines if escape key down trigger onClose
    closeOnEscape?: boolean;
}

/**
 * CommonModal
 *
 * An MUI Dialog that replaces the native Paper slot with a CommonCard.
 * It relies entirely on centralized theme styling for dimensions and z-index,
 * while safely merging any explicit developer prop overrides.
 *
 * @example
 * <CommonModal
 *  cardProps={{
 *      className: 'custom-card',
 *      variant: 'medium'
 *  }}
 *  open={true}
 * >
 *  <p>Modal content</p>
 * </CommonModal>
 */
export default function CommonModal({
    cardProps,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    slotProps,
    slots,
    onClose,
    ...props
}: CommonModalProps) {
    const { isCompact } = useBreakpoint();
    const originalPaperSlot = slotProps?.paper; // Capture original slot for evaluation
    const isPaperSlotFunction = typeof originalPaperSlot === 'function';
    const resolvedPaperSlot = isPaperSlotFunction
        ? getMergedPaperProps
        : getMergedPaperProps(); // JIT evaluation of the paper slot

    /**
     * Resolves the MUI paper slot props, safely merging styles, sx arrays,
     * and class names without injecting hardcoded layout properties.
     *
     * @param ownerState - The internal MUI state passed to the slot callback.
     * @returns
     */
    function getMergedPaperProps(ownerState?: DialogOwnerState) {
        const resolvedProps = isPaperSlotFunction && ownerState
            ? originalPaperSlot(ownerState)
            : (typeof originalPaperSlot === 'object'
                ? originalPaperSlot
                : {}
            );

        return {
            ...cardProps,
            ...resolvedProps,
            className: classMerge(
                cardProps?.className,
                resolvedProps.className
            ),
            style: {
                ...cardProps?.style,
                ...resolvedProps.style
            },
            sx: [
                ...normalizeSx(cardProps?.sx),
                ...normalizeSx(resolvedProps.sx)
            ]
        } as Partial<PaperProps>;
    }

    /**
     * Intercepts native close events to enforce backdrop click preferences.
     *
     * @param event - The interaction event from MUI or a manual click.
     * @param reason - The reason the dialog is closing.
     * @returns
     */
    function handleClose(event: DialogCloseProps[0], reason?: DialogCloseProps[1]) {
        if ((reason === 'backdropClick' && !closeOnBackdropClick)
            || (reason === 'escapeKeyDown' && !closeOnEscape)
        ) {
            return;
        }

        onClose?.(event, reason ?? 'escapeKeyDown');
    }

    return <Dialog
        fullScreen={isCompact}
        {...props}
        slotProps={{
            ...slotProps,
            paper: resolvedPaperSlot
        }}
        slots={{
            paper: CommonCard,
            ...slots
        }}
        onClose={handleClose}
    />;
}
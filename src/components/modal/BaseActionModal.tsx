import ModalButtons, { ModalButtonProps } from '@components/button/ModalButtons';
import CommonModal, { CommonModalProps } from '@components/modal/CommonModal';
import { classMerge } from '@utils/css.util';
import { useTranslation } from 'react-i18next';

export interface BaseActionModalProps extends CommonModalProps {
    // Additional container class name
    containerClassName?: string;

    // Modal button props
    modalButtonProps?: ModalButtonProps;
}

/**
 * BaseActionModal
 *
 * A foundational action modal component that integrates CommonModal with standardized action buttons.
 *
 * @example
 * <BaseActionModal
 *  title="Confirm Action"
 *  onClose={handleClose}
 *  isOpen={isOpen}
 * >
 *  <p>Are you sure you want to proceed?</p>
 * </BaseActionModal>
 */
export default function BaseActionModal({
    children,
    containerClassName,
    modalButtonProps,
    ...props
}: BaseActionModalProps) {
    const { t } = useTranslation(); // Translation hook
    const resolvedCancelProps = {
        children: t('cancel'),
        ...modalButtonProps?.cancelProps
    }; // Resolved props for the cancel button
    const resolvedModalButtonsClassName = classMerge(
        'mt-auto w-full',
        modalButtonProps?.className
    ); // Resolved class name for the button container
    const containerClasses = classMerge(
        'flex flex-col gap-(--mui-tokens-spacing-8) pt-(--mui-tokens-spacing-5)',
        containerClassName
    ); // Merged container classes

    return (
        <CommonModal {...props}>
            <div className={containerClasses}>
                {children}
                <ModalButtons
                    {...modalButtonProps}
                    cancelProps={resolvedCancelProps}
                    className={resolvedModalButtonsClassName}
                />
            </div>
        </CommonModal>
    );
}
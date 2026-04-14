import ModalButtons, { ModalButtonProps } from '@components/button/ModalButtons';
import CommonModal, { CommonModalProps } from '@components/modal/CommonModal';
import { classMerge } from '@utils/css.util';
import { useTranslation } from 'react-i18next';

export interface CommonActionModalProps extends CommonModalProps {
    // Additional container class name
    containerClassName?: string;

    // Modal button props
    modalButtonProps?: ModalButtonProps;
}

/**
 * CommonActionModal
 *
 * A foundational action modal component that integrates CommonModal with standardized action buttons.
 *
 * @example
 * <CommonActionModal
 *  title="Confirm Action"
 *  onClose={handleClose}
 *  isOpen={isOpen}
 * >
 *  <p>Are you sure you want to proceed?</p>
 * </CommonActionModal>
 */
export default function CommonActionModal({
    children,
    containerClassName,
    modalButtonProps,
    ...props
}: CommonActionModalProps) {
    const { t } = useTranslation(); // Translation hook
    const { cancelProps, className } = modalButtonProps ?? {}; // Destructure modalButtonProps for easy access

    return (
        <CommonModal {...props}>
            <div
                className={
                    classMerge(
                        'flex flex-col gap-(--mui-tokens-spacing-8) pt-(--mui-tokens-spacing-5)',
                        containerClassName
                    )
                }
            >
                {children}
                <ModalButtons
                    {...modalButtonProps}
                    cancelProps={{
                        children: t('cancel'),
                        ...cancelProps
                    }}
                    className={
                        classMerge(
                            'mt-auto w-full',
                            className
                        )
                    }
                />
            </div>
        </CommonModal>
    );
}
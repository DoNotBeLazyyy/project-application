import { ModalButtonProps } from '@components/button/ModalButtons';
import BaseActionModal, { BaseActionModalProps } from '@components/modal/BaseActionModal';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface FilterModalProps extends BaseActionModalProps {
    // Form content
    formContent?: ReactNode;

    // Modal button props
    modalButtonProps?: ModalButtonProps;
}

export default function FilterModal({
    containerClassName,
    formContent,
    modalButtonProps,
    ...props
}: FilterModalProps) {
    const { t } = useTranslation(); // Translation hook
    const resolvedConfirmProps = {
        children: t('filter_list'),
        ...modalButtonProps?.confirmProps
    }; // Resolved props for the cancel button
    const resolvedCancelProps = {
        variant: 'secondary' as const,
        ...modalButtonProps?.cancelProps
    }; // Resolved props for the cancel button

    return (
        <BaseActionModal
            {...props}
            cardProps={{
                cardHeaderProps: {
                    title: t('default_filter_modal_title'),
                    subheader: t('default_filter_modal_subtitle')
                }
            }}
            containerClassName={
                classMerge(
                    'w-[54.0625rem]',
                    containerClassName
                )
            }
            modalButtonProps={{
                ...modalButtonProps,
                cancelProps: resolvedCancelProps,
                confirmProps: resolvedConfirmProps
            }}
        >
            {formContent}
        </BaseActionModal>
    );
}
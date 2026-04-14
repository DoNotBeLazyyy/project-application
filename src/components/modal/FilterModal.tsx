import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface FilterModalProps extends CommonActionModalProps {
    // Form content
    formContent?: ReactNode;
}

/**
 * FilterModal
 *
 * A specialized modal layout for filtering lists and tables, featuring
 * a wide container and default header text.
 *
 * @example
 * <FilterModal
 * open={isOpen}
 * onClose={handleClose}
 * formContent={<FilterForm />}
 * />
 */
export default function FilterModal({
    containerClassName,
    formContent,
    modalButtonProps,
    ...props
}: FilterModalProps) {
    const { t } = useTranslation(); // Translation hook
    const { cancelProps, confirmProps } = modalButtonProps ?? {}; // Destructured button properties

    return (
        <CommonActionModal
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
                cancelProps: {
                    color: 'secondary',
                    ...cancelProps
                },
                confirmProps: {
                    children: t('filter_list'),
                    ...confirmProps
                }
            }}
        >
            {formContent}
        </CommonActionModal>
    );
}
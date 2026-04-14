import BaseActionModal, { BaseActionModalProps } from '@components/modal/BaseActionModal';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface FilterModalProps extends BaseActionModalProps {
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
                cancelProps: {
                    variant: 'secondary' as const,
                    ...modalButtonProps?.cancelProps
                },
                confirmProps: {
                    children: t('filter_list'),
                    ...modalButtonProps?.confirmProps
                }
            }}
        >
            {formContent}
        </BaseActionModal>
    );
}
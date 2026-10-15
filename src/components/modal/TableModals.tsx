import CommonFormModal, { CommonFormModalProps } from '@components/modal/CommonFormModal';
import FilterSortModal, { FilterSortModalProps } from '@components/modal/FilterSortModal';
import SortModal, { SortModalProps } from '@components/modal/sort-modal/SortModal';
import { normalizeSx } from '@utils/theme.util';

export interface TableModalsProps {
    createModalProps?: CommonFormModalProps;
    filterModalProps?: CommonFormModalProps;
    filterSortModalProps?: FilterSortModalProps;
    sortModalProps?: SortModalProps;
    updateModalProps?: CommonFormModalProps;
    viewModalProps?: CommonFormModalProps;
}

export default function TableModals({
    createModalProps,
    filterModalProps,
    filterSortModalProps,
    sortModalProps,
    updateModalProps,
    viewModalProps
}: TableModalsProps) {
    return (
        <>
            {createModalProps && <CommonFormModal {...createModalProps} />}
            {updateModalProps && <CommonFormModal {...updateModalProps} />}
            {viewModalProps && <CommonFormModal
                {...viewModalProps}
                hideCancel
            />}
            {filterModalProps && (
                <CommonFormModal
                    containerClassName="w-full"
                    {...filterModalProps}
                    sx={[
                        {
                            '& .MuiDialog-paper:not(.MuiDialog-paperFullScreen)': {
                                maxWidth: { xs: 'calc(100% - 2rem)', sm: '34rem' },
                                width: { xs: 'calc(100% - 2rem)', sm: '100%' }
                            }
                        },
                        ...normalizeSx(filterModalProps.sx)
                    ]}
                />
            )}
            {sortModalProps && <SortModal {...sortModalProps} />}
            {filterSortModalProps && <FilterSortModal {...filterSortModalProps} />}
        </>
    );
}
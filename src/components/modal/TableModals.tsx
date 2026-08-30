import CommonFormModal, { CommonFormModalProps } from '@components/modal/CommonFormModal';
import FilterSortModal, { FilterSortModalProps } from '@components/modal/FilterSortModal';
import SortModal, { SortModalProps } from '@components/modal/sort-modal/SortModal';

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
            {filterModalProps && <CommonFormModal {...filterModalProps} />}
            {sortModalProps && <SortModal {...sortModalProps} />}
            {filterSortModalProps && <FilterSortModal {...filterSortModalProps} />}
        </>
    );
}
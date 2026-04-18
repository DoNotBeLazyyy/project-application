import CommonFormModal, { CommonFormModalProps } from '@components/modal/CommonFormModal';
import SortModal, { SortModalProps } from '@components/modal/sort-modal/SortModal';

export interface TableModalsProps {
    createModalProps?: CommonFormModalProps;
    filterModalProps?: CommonFormModalProps;
    sortModalProps?: SortModalProps;
    updateModalProps?: CommonFormModalProps;
    viewModalProps?: CommonFormModalProps;
}

export default function TableModals({
    createModalProps,
    filterModalProps,
    sortModalProps,
    updateModalProps,
    viewModalProps
}: TableModalsProps) {
    return (
        <>
            {createModalProps && <CommonFormModal {...createModalProps} />}
            {updateModalProps && <CommonFormModal {...updateModalProps} />}
            {viewModalProps && <CommonFormModal {...viewModalProps} />}
            {filterModalProps && <CommonFormModal {...filterModalProps} />}
            {sortModalProps && <SortModal {...sortModalProps} />}
        </>
    );
}
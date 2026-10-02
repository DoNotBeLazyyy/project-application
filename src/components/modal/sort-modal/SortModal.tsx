import CommonFormModal, { CommonFormModalProps } from '@components/modal/CommonFormModal';
import SortFieldsEditor from '@components/modal/sort-modal/SortFieldsEditor';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { SortStringDto } from '@type/http.type';
import React, { useEffect, useState } from 'react';

export interface SortModalProps extends Omit<CommonFormModalProps, 'formContent'> {
    columns: SortColumn[];
    currentSort: SortStringDto[];
    onApply: (sort: SortStringDto[]) => void;
}

export default function SortModal({
    columns,
    currentSort,
    open,
    onApply,
    onClose,
    ...rest
}: SortModalProps) {
    const [localSort, setLocalSort] = useState<SortStringDto[]>([]);

    useEffect(function() {
        if (open) {
            setLocalSort([...currentSort]);
        }
    }, [open, currentSort]);

    function handleCancelClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (onClose) {
            onClose(event, 'backdropClick');
        }
    }

    function handleConfirmClick() {
        onApply(localSort);
    }

    return (
        <CommonFormModal
            {...rest}
            cardProps={{
                cardHeaderProps: {
                    subheader: 'Select fields and set sort direction.',
                    title: 'Sort By',
                    ...rest.cardProps?.cardHeaderProps
                },
                ...rest.cardProps
            }}
            confirmText={rest.confirmText ?? 'Apply Sort'}
            containerClassName={rest.containerClassName ?? 'w-full max-w-full sm:w-[28rem]'}
            formButtonsProps={{
                ...rest.formButtonsProps,
                cancelProps: {
                    onClick: handleCancelClick,
                    ...rest.formButtonsProps?.cancelProps
                },
                confirmProps: {
                    onClick: handleConfirmClick,
                    ...rest.formButtonsProps?.confirmProps
                }
            }}
            formContent={
                <SortFieldsEditor
                    columns={columns}
                    value={localSort}
                    onChange={setLocalSort}
                />
            }
            open={open}
            onClose={onClose}
        />
    );
}
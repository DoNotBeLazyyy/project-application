import CommonFormModal, { CommonFormModalProps } from '@components/modal/CommonFormModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import SortFieldsEditor from '@components/modal/sort-modal/SortFieldsEditor';
import { SortStringDto } from '@type/http.type';
import { normalizeSx } from '@utils/theme.util';
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
            onClose(event, 'escapeKeyDown');
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
            containerClassName={rest.containerClassName ?? 'w-full'}
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
            formContent={(
                <div className="w-full">
                    <SortFieldsEditor
                        columns={columns}
                        value={localSort}
                        onChange={setLocalSort}
                    />
                </div>
            )}
            open={open}
            sx={[
                {
                    '& .MuiDialog-paper:not(.MuiDialog-paperFullScreen)': {
                        maxWidth: { xs: 'calc(100% - 2rem)', sm: '30rem' },
                        width: { xs: 'calc(100% - 2rem)', sm: '100%' }
                    }
                },
                ...normalizeSx(rest.sx)
            ]}
            onClose={onClose}
        />
    );
}
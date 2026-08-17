import CommonButton from '@components/button/CommonButton';
import CommonFormModal, { CommonFormModalProps } from '@components/modal/CommonFormModal';
import SortColumnItem, { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { PlusCircleIcon } from '@phosphor-icons/react';
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

    const selectedFields = localSort.map(function(s) {
        return s.sortKey;
    });

    const unselectedColumns = columns.filter(function(col) {
        return !selectedFields.includes(col.field);
    });

    function handleAddField() {
        if (!unselectedColumns.length) {
            return;
        }

        setLocalSort(function(prev) {
            return [
                ...prev,
                {
                    isAsc: true,
                    sortKey: unselectedColumns[0].field
                }
            ];
        });
    }

    function handleRemove(field: string) {
        setLocalSort(function(prev) {
            return prev.filter(function(s) {
                return s.sortKey !== field;
            });
        });
    }

    function handleChangeField(oldField: string, newField: string) {
        setLocalSort(function(prev) {
            return prev.map(function(s) {
                return s.sortKey === oldField
                    ? { ...s, sortKey: newField }
                    : s;
            });
        });
    }

    function handleToggleDirection(field: string, isAsc: boolean) {
        setLocalSort(function(prev) {
            return prev.map(function(s) {
                return s.sortKey === field
                    ? { ...s, isAsc }
                    : s;
            });
        });
    }

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
            containerClassName={rest.containerClassName ?? 'max-w-full w-[28rem]'}
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
                <div className="flex flex-col gap-3">
                    {localSort.map(function(sortItem) {
                        const column = columns.find(function(col) {
                            return col.field === sortItem.sortKey;
                        });

                        if (!column) {
                            return null;
                        }

                        const availableColumns = columns.filter(function(col) {
                            return !selectedFields.includes(col.field) || col.field === sortItem.sortKey;
                        });

                        return (
                            <SortColumnItem
                                activeSort={sortItem}
                                availableColumns={availableColumns}
                                column={column}
                                key={sortItem.sortKey}
                                onChangeField={handleChangeField}
                                onRemove={handleRemove}
                                onToggleDirection={handleToggleDirection}
                            />
                        );
                    })}
                    <CommonButton
                        color="primary"
                        disabled={!unselectedColumns.length}
                        size="small"
                        startIcon={<PlusCircleIcon weight="bold" />}
                        variant="text"
                        onClick={handleAddField}
                    >
                        Add Field
                    </CommonButton>
                </div>
            }
            open={open}
            onClose={onClose}
        />
    );
}
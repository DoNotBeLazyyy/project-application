import CommonButton from '@components/button/CommonButton';
import SortColumnItem, { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { PlusCircleIcon } from '@phosphor-icons/react';
import { SortStringDto } from '@type/http.type';

export interface SortFieldsEditorProps {
    columns: SortColumn[];
    value: SortStringDto[];
    onChange: (sort: SortStringDto[]) => void;
}

/**
 * SortFieldsEditor
 *
 * The add/change/remove field-and-direction editor shared by SortModal and
 * FilterSortModal, so both surfaces stay in sync without duplicating the logic.
 */
export default function SortFieldsEditor({ columns, value, onChange }: SortFieldsEditorProps) {
    const selectedFields = value.map(function(s) {
        return s.sortKey;
    });

    const unselectedColumns = columns.filter(function(col) {
        return !selectedFields.includes(col.field);
    });

    function handleAddField() {
        if (!unselectedColumns.length) {
            return;
        }

        onChange([
            ...value,
            {
                isAsc: true,
                sortKey: unselectedColumns[0].field
            }
        ]);
    }

    function handleRemove(field: string) {
        onChange(value.filter(function(s) {
            return s.sortKey !== field;
        }));
    }

    function handleChangeField(oldField: string, newField: string) {
        onChange(value.map(function(s) {
            return s.sortKey === oldField
                ? { ...s, sortKey: newField }
                : s;
        }));
    }

    function handleToggleDirection(field: string, isAsc: boolean) {
        onChange(value.map(function(s) {
            return s.sortKey === field
                ? { ...s, isAsc }
                : s;
        }));
    }

    return (
        <div className="flex flex-col gap-3">
            {value.map(function(sortItem) {
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
    );
}
import SortDirectionButton from '@components/modal/sort-modal/SortDirectionButton';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { MinusCircleIcon } from '@phosphor-icons/react';
import { SortStringDto } from '@type/http.type';

export interface SortColumn {
    field: string;
    label: string;
}

interface SortColumnItemProps {
    activeSort: SortStringDto;
    availableColumns: SortColumn[];
    column: SortColumn;
    onChangeField: (oldField: string, newField: string) => void;
    onRemove: (field: string) => void;
    onToggleDirection: (field: string, isAsc: boolean) => void;
}

export default function SortColumnItem({
    activeSort,
    availableColumns,
    column,
    onChangeField,
    onRemove,
    onToggleDirection
}: SortColumnItemProps) {
    const isAsc = activeSort.isAsc ?? true;

    const options: CommonSelectOption[] = availableColumns.map(function(col) {
        return {
            label: col.label,
            value: col.field
        };
    });

    function handleFieldChange(e: React.ChangeEvent<HTMLInputElement>) {
        onChangeField(column.field, e.target.value);
    }

    function handleAsc() {
        onToggleDirection(column.field, true);
    }

    function handleDesc() {
        onToggleDirection(column.field, false);
    }

    function handleRemove() {
        onRemove(column.field);
    }

    return (
        <div className="flex gap-2 items-center">
            <MinusCircleIcon
                className="cursor-pointer h-5 shrink-0 text-(--mui-palette-primary-main) w-5"
                onClick={handleRemove}
            />
            <CommonSelect
                fullWidth
                options={options}
                size="small"
                value={column.field}
                onChange={handleFieldChange}
            />
            <div className="flex gap-1">
                <SortDirectionButton
                    active={isAsc}
                    onClick={handleAsc}
                />
                <SortDirectionButton
                    active={!isAsc}
                    isAsc={false}
                    onClick={handleDesc}
                />
            </div>
        </div>
    );
}
import CommonButton from '@components/button/CommonButton';
import { FormField, FormFieldConfig } from '@components/form/FormField';
import { MinusCircleIcon, PlusIcon } from '@phosphor-icons/react';
import { CommonTableProps } from '@type/table.type';
import { classMerge } from '@utils/css.util';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { CSSProperties, ReactNode } from 'react';
import { Control, FieldValues } from 'react-hook-form';

export interface CommonFormTableCellParams<TForm extends FieldValues> extends ICellRendererParams {
    control: Control<TForm>;
    disabled?: boolean;
    fieldName: string;
    rowIndex: number;
}

export interface CommonFormTableColumn<TRow, TForm extends FieldValues> extends Omit<ColDef, 'cellRenderer' | 'field'> {
    key: keyof TRow;
    fieldConfig?: Omit<FormFieldConfig<FieldValues>, 'name'>;
    renderCell?: (params: CommonFormTableCellParams<TForm>) => ReactNode;
}

export interface CommonFormTableProps<TRow, TForm extends FieldValues> {
    columns: CommonFormTableColumn<TRow, TForm>[];
    control: Control<TForm>;
    fieldArrayName: string;
    rows: (TRow & { id: string })[];
    title?: string;
    emptyDataMessage?: string;
    disabled?: boolean;
    hideAddRow?: boolean;
    hideRowActions?: boolean;
    minRows?: number;
    startIndex?: number;
    tableProps?: CommonTableProps;
    totalRows?: number;
    onAddRow?: () => void;
    onRemoveRow?: (index: number) => void;
}

export default function CommonFormTable<TRow, TForm extends FieldValues>({
    columns,
    control,
    disabled,
    emptyDataMessage,
    fieldArrayName,
    hideAddRow,
    hideRowActions,
    minRows = 0,
    rows,
    startIndex = 0,
    title,
    tableProps,
    totalRows,
    onAddRow,
    onRemoveRow
}: CommonFormTableProps<TRow, TForm>) {
    const showActions = !disabled && !hideRowActions;
    const canRemoveRow = (totalRows ?? rows.length) > minRows;

    function columnStyle(flex?: number): CSSProperties {
        return {
            flex: flex ?? 1,
            minWidth: 0
        };
    }

    return (
        <div className="flex flex-col gap-2 h-full w-full">
            {title && (
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {title}
                </span>
            )}
            <div className={classMerge('flex flex-col flex-1 min-h-0 overflow-auto', tableProps?.containerClassName)}>
                <div className="border-b border-(--mui-palette-divider) flex gap-2 items-center pb-2 sticky top-0 z-10 bg-(--mui-palette-background-paper)">
                    {columns.map((column) => (
                        <div
                            className="font-medium text-(--mui-palette-text-secondary) text-xs uppercase"
                            key={String(column.key)}
                            style={columnStyle(column.flex)}
                        >
                            {column.headerName}
                        </div>
                    ))}
                    {showActions && (
                        <div className="flex items-center justify-center shrink-0 w-12">
                            {!hideAddRow && (
                                <CommonButton
                                    size="small"
                                    startIcon={
                                        <PlusIcon
                                            className="text-(--mui-palette-primary-main)"
                                            size={18}
                                            weight="bold"
                                        />
                                    }
                                    variant="text"
                                    onClick={onAddRow}
                                />
                            )}
                        </div>
                    )}
                </div>
                {rows.length === 0
                    ? (
                        <div className="flex items-center justify-center py-6 text-(--mui-palette-text-secondary) text-sm">
                            {emptyDataMessage}
                        </div>
                    )
                    : rows.map((row, offset) => (
                        <div
                            className="flex gap-2 py-1.5"
                            key={row.id}
                        >
                            {columns.map((column) => {
                                const index = startIndex + offset;
                                const fieldName = `${fieldArrayName}.${index}.${String(column.key)}`;
                                const params = {
                                    control,
                                    data: row,
                                    disabled,
                                    fieldName,
                                    rowIndex: index
                                } as unknown as CommonFormTableCellParams<TForm>;

                                return (
                                    <div
                                        className="flex flex-col justify-center"
                                        key={String(column.key)}
                                        style={columnStyle(column.flex)}
                                    >
                                        {column.fieldConfig
                                            ? (
                                                <FormField
                                                    control={control as unknown as Control<FieldValues>}
                                                    field={{
                                                        ...column.fieldConfig,
                                                        name: fieldName,
                                                        disabled: disabled ?? column.fieldConfig.disabled,
                                                        fieldProps: {
                                                            size: 'small',
                                                            ...column.fieldConfig.fieldProps
                                                        }
                                                    } as FormFieldConfig<FieldValues>}
                                                    hasHelper
                                                />
                                            )
                                            : column.renderCell
                                                ? column.renderCell(params)
                                                : null
                                        }
                                    </div>
                                );
                            })}
                            {showActions && (
                                <div className="flex items-center justify-center shrink-0 w-12">
                                    {canRemoveRow && (
                                        <MinusCircleIcon
                                            className="cursor-pointer text-(--mui-palette-error-main)"
                                            size={18}
                                            weight="bold"
                                            onClick={function() {
                                                onRemoveRow?.(startIndex + offset);
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                }
            </div>
        </div>
    );
}
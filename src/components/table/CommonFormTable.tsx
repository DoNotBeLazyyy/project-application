import CommonButton from '@components/button/CommonButton';
import { FormField, FormFieldConfig } from '@components/form/FormField';
import CommonTable from '@components/table/CommonTable';
import { MinusCircleIcon, PlusIcon } from '@phosphor-icons/react';
import { CommonTableProps } from '@type/table.type';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ReactNode, useMemo } from 'react';
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
    tableProps?: CommonTableProps;
    onAddRow?: () => void;
    onRemoveRow: (index: number) => void;
}

export default function CommonFormTable<TRow, TForm extends FieldValues>({
    columns,
    control,
    disabled,
    emptyDataMessage,
    fieldArrayName,
    rows,
    title,
    tableProps,
    onAddRow,
    onRemoveRow
}: CommonFormTableProps<TRow, TForm>) {
    const columnDefs = useMemo<ColDef[]>(function() {
        const dataCols: ColDef[] = columns.map((col) => {
            const { key, fieldConfig, renderCell, ...colDefProps } = col;

            return {
                ...colDefProps,
                colId: String(key),
                suppressMovable: true,
                cellRendererParams: (params: ICellRendererParams) => ({
                    control,
                    disabled,
                    fieldName: `${fieldArrayName}.${params.data._index}.${String(key)}`,
                    rowIndex: params.data._index,
                    ...params
                }),
                cellRenderer: (params: CommonFormTableCellParams<TForm>) => (
                    <div className="flex h-full items-center w-full">
                        {fieldConfig
                            ? (
                                <FormField
                                    control={params.control as unknown as Control<FieldValues>}
                                    field={{
                                        ...fieldConfig,
                                        name: params.fieldName,
                                        disabled: params.disabled ?? fieldConfig.disabled
                                    } as FormFieldConfig<FieldValues>}
                                />
                            )
                            : renderCell
                                ? renderCell(params)
                                : null
                        }
                    </div>
                )
            };
        });

        if (!disabled) {
            dataCols.push({
                colId: 'remove',
                headerName: '',
                maxWidth: 48,
                minWidth: 48,
                suppressMovable: true,
                headerComponent: () => (
                    <div className="flex h-full items-center justify-center w-full">
                        <CommonButton
                            size="small"
                            startIcon={<PlusIcon
                                className="text-(--mui-palette-primary-main)"
                                size={18}
                                weight="bold"
                            />}
                            variant="text"
                            onClick={onAddRow}
                        />
                    </div>
                ),
                cellRenderer: (params: ICellRendererParams) => (
                    <div className="flex h-full items-center justify-center w-full">
                        <MinusCircleIcon
                            className="cursor-pointer text-(--mui-palette-error-main)"
                            size={18}
                            weight="bold"
                            onClick={function() {
                                onRemoveRow(params.data._index);
                            }}
                        />
                    </div>
                )
            });
        }

        return dataCols;
    }, [columns, control, disabled, fieldArrayName, onRemoveRow]);

    const rowDataWithIndex = useMemo(function() {
        return rows.map((row, index) => ({ ...row, _index: index }));
    }, [rows]);

    return (
        <div className="flex flex-col gap-2 h-full w-full">
            <div className="flex items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {title}
                </span>
            </div>
            <CommonTable
                {...tableProps}
                leadingColumnDefs={columnDefs}
                noRowsOverlayComponent={emptyDataMessage}
                rowData={rowDataWithIndex}
                suppressRowVirtualisation
            />
        </div>
    );
}
import CommonButton from '@components/button/CommonButton';
import { FormField, FormFieldConfig } from '@components/form/FormField';
import {
    ArrowDownIcon,
    ArrowUpIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
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

    /**
     * Sits on the header + rows track inside the scroll box. Use it to hold a
     * minimum width so narrow screens scroll sideways instead of crushing every
     * column into an unusable sliver.
     */
    contentClassName?: string;
    emptyDataMessage?: string;
    disabled?: boolean;
    hideAddRow?: boolean;
    hideRowActions?: boolean;
    listFooter?: ReactNode;
    minRows?: number;
    showRowNumber?: boolean;
    startIndex?: number;
    tableProps?: CommonTableProps;
    totalRows?: number;
    onAddRow?: () => void;
    onMoveRow?: (fromIndex: number, toIndex: number) => void;
    onRemoveRow?: (index: number) => void;
}

export default function CommonFormTable<TRow, TForm extends FieldValues>({
    columns,
    contentClassName,
    control,
    disabled,
    emptyDataMessage,
    fieldArrayName,
    hideAddRow,
    hideRowActions,
    listFooter,
    minRows = 0,
    rows,
    showRowNumber,
    startIndex = 0,
    title,
    tableProps,
    totalRows,
    onAddRow,
    onMoveRow,
    onRemoveRow
}: CommonFormTableProps<TRow, TForm>) {
    const showActions = !disabled && !hideRowActions;
    const canRemoveRow = (totalRows ?? rows.length) > minRows;

    function columnStyle(column: CommonFormTableColumn<TRow, TForm>): CSSProperties {
        if (column.width !== undefined) {
            return {
                flexShrink: 0,
                maxWidth: `${column.width}px`,
                minWidth: `${column.width}px`,
                width: `${column.width}px`
            };
        }

        return {
            flex: column.flex ?? 1,
            maxWidth: column.maxWidth !== undefined ? `${column.maxWidth}px` : undefined,
            minWidth: column.minWidth !== undefined ? `${column.minWidth}px` : 0
        };
    }

    return (
        <div className="flex flex-1 flex-col gap-2 min-h-0 w-full">
            {title && (
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {title}
                </span>
            )}
            {/*
              * Header and rows share one scroll box so both sit inside the same
              * scrollbar gutter - that is what keeps the row delete buttons lined
              * up under the header add button. The header only stops scrolling
              * because it is sticky, not because it lives in a separate box.
              */}
            <div className={classMerge('flex flex-col flex-1 min-h-0 overflow-auto', tableProps?.containerClassName)}>
                <div className={classMerge('flex flex-col flex-1 min-h-0 min-w-full', contentClassName)}>
                    <div className="bg-(--mui-palette-background-paper) border-(--mui-palette-divider) border-b flex gap-2 items-center pb-2 shrink-0 sticky top-0 z-1">
                        {showRowNumber && (
                            <div className="flex font-medium items-center shrink-0 text-(--mui-palette-text-secondary) text-xs uppercase w-8">
                                #
                            </div>
                        )}
                        {columns.map((column) => (
                            <div
                                className={classMerge(
                                    'font-medium text-(--mui-palette-text-secondary) text-xs uppercase',
                                    column.headerClass,
                                    column.fieldConfig?.type === 'checkbox' && 'flex justify-center text-center'
                                )}
                                key={String(column.key)}
                                style={columnStyle(column)}
                            >
                                {column.headerName}
                            </div>
                        ))}
                        {onMoveRow && (
                            <div className="flex font-medium items-center justify-center shrink-0 text-(--mui-palette-text-secondary) text-xs uppercase w-20">
                                SORT
                            </div>
                        )}
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
                    <div className="flex flex-col">
                        {rows.length === 0
                            ? (
                                <div className="flex items-center justify-center py-6 text-(--mui-palette-text-secondary) text-sm">
                                    {emptyDataMessage}
                                </div>
                            )
                            : rows.map((row, offset) => {
                                const globalIndex = startIndex + offset;
                                const effectiveTotal = totalRows ?? rows.length;
                                const isFirstRow = globalIndex === 0;
                                const isLastRow = globalIndex === effectiveTotal - 1;

                                return (
                                    <div
                                        className="flex gap-2 py-1.5"
                                        key={row.id}
                                    >
                                        {showRowNumber && (
                                            <div className="flex font-medium items-center shrink-0 text-(--mui-palette-text-secondary) text-xs w-8">
                                                {globalIndex + 1}
                                            </div>
                                        )}
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
                                                    className={classMerge(
                                                        'flex flex-col justify-center',
                                                        column.cellClass,
                                                        column.fieldConfig?.type === 'checkbox' && 'items-center'
                                                    )}
                                                    key={String(column.key)}
                                                    style={columnStyle(column)}
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
                                        {onMoveRow && (
                                            <div className="flex gap-1 items-center justify-center shrink-0 w-20">
                                                <CommonButton
                                                    aria-label="Move row up"
                                                    color="inherit"
                                                    disabled={disabled || isFirstRow}
                                                    size="xsmall"
                                                    startIcon={<ArrowUpIcon weight="bold" />}
                                                    variant="text"
                                                    onClick={function() {
                                                        if (!isFirstRow) {
                                                            onMoveRow(globalIndex, globalIndex - 1);
                                                        }
                                                    }}
                                                />
                                                <CommonButton
                                                    aria-label="Move row down"
                                                    color="inherit"
                                                    disabled={disabled || isLastRow}
                                                    size="xsmall"
                                                    startIcon={<ArrowDownIcon weight="bold" />}
                                                    variant="text"
                                                    onClick={function() {
                                                        if (!isLastRow) {
                                                            onMoveRow(globalIndex, globalIndex + 1);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {showActions && (
                                            <div className="flex items-center justify-center shrink-0 w-12">
                                                {canRemoveRow && (
                                                    <CommonButton
                                                        aria-label="Delete row"
                                                        color="error"
                                                        disabled={disabled}
                                                        size="xsmall"
                                                        startIcon={<TrashIcon weight="bold" />}
                                                        variant="text"
                                                        onClick={function() {
                                                            onRemoveRow?.(startIndex + offset);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        }
                        {listFooter}
                    </div>
                </div>
            </div>
        </div>
    );
}
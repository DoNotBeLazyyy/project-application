import CommonFormTable, { CommonFormTableColumn } from '@components/table/CommonFormTable';
import { PeriodFormValues } from '@pages/admin/grading-config-management/PeriodModalForm';
import { GradingComponentTemplate } from '@type/grading-config.type';
import { Control, UseFieldArrayRemove } from 'react-hook-form';

const COMPONENT_COLUMNS: CommonFormTableColumn<GradingComponentTemplate, PeriodFormValues>[] = [
    {
        key: 'name',
        headerName: 'Component Name',
        flex: 2,
        fieldConfig: {
            type: 'text',
            rules: { required: 'Required' }
        }
    },
    {
        key: 'weight',
        headerName: 'Weight (%)',
        flex: 1,
        fieldConfig: {
            type: 'number',
            rules: {
                required: 'Required',
                min: { value: 1, message: 'Min 1' },
                max: { value: 100, message: 'Max 100' }
            },
            fieldProps: {
                max: 100,
                min: 1
            }
        }
    }
];

export interface PeriodTableFormProps {
    control: Control<PeriodFormValues>;
    componentTotal: number;
    disabled?: boolean;
    fields: (GradingComponentTemplate & { id: string })[];
    onAddRow: () => void;
    onRemoveRow: UseFieldArrayRemove;
}

export default function PeriodTableForm({
    control,
    componentTotal,
    disabled = false,
    fields,
    onAddRow,
    onRemoveRow
}: PeriodTableFormProps) {
    return (
        <div className="flex flex-col gap-2 h-100">
            <div className="flex items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Components
                </span>
                {!disabled && (
                    <span
                        className="font-medium text-xs"
                        style={{
                            color: componentTotal === 100
                                ? 'var(--mui-palette-success-main)'
                                : 'var(--mui-palette-error-main)'
                        }}
                    >
                        {`Total: ${componentTotal}%`}
                        {componentTotal === 100
                            ? ' ✓'
                            : ' (must equal 100%)'}
                    </span>
                )}
            </div>
            <div className="flex flex-1 h-full w-full">
                <CommonFormTable<GradingComponentTemplate, PeriodFormValues>
                    columns={COMPONENT_COLUMNS}
                    control={control}
                    disabled={disabled}
                    emptyDataMessage="No components yet. Click + to add one."
                    fieldArrayName="components"
                    rows={fields}
                    tableProps={{
                        containerClassName: 'min-h-0 h-full'
                    }}
                    onAddRow={onAddRow}
                    onRemoveRow={onRemoveRow}
                />
            </div>
        </div>
    );
}
import CommonButton from '@components/button/CommonButton';
import CommonFormTableCard from '@components/table-card/CommonFormTableCard';
import { CommonFormTableColumn } from '@components/table/CommonFormTable';
import { useToastStore } from '@stores/toast.store';
import { TransmutationRow } from '@type/grading-config.type';
import { checkForMessage } from '@utils/form.util';
import { FieldValues, useFieldArray, useForm } from 'react-hook-form';

interface TransmutationFormValues extends FieldValues {
    rows: TransmutationRow[];
}

const DEFAULT_ROW: TransmutationRow = {
    min_percentage: '',
    max_percentage: '',
    transmuted_grade: '',
    description: ''
};

const COLUMNS: CommonFormTableColumn<TransmutationRow, TransmutationFormValues>[] = [
    {
        key: 'min_percentage',
        headerName: 'Min %',
        flex: 1,
        fieldConfig: {
            type: 'number',
            rules: {
                required: 'Required',
                min: { value: 0, message: 'Min 0' }
            }
        }
    },
    {
        key: 'max_percentage',
        headerName: 'Max %',
        flex: 1,
        fieldConfig: {
            type: 'number',
            rules: {
                required: 'Required',
                min: { value: 0, message: 'Min 0' }
            }
        }
    },
    {
        key: 'transmuted_grade',
        headerName: 'Grade (1.0–5.0)',
        flex: 1,
        fieldConfig: {
            type: 'number',
            rules: {
                required: 'Required',
                min: { value: 1.0, message: 'Min 1.0' },
                max: { value: 5.0, message: 'Max 5.0' }
            }
        }
    },
    {
        key: 'description',
        headerName: 'Description',
        flex: 2,
        fieldConfig: {
            type: 'text'
        }
    }
];

interface TransmutationTabProps {
    initialRows: TransmutationRow[];
    isSaving: boolean;
    onSave: (rows: TransmutationRow[]) => Promise<void>;
}

export default function TransmutationTab({
    initialRows,
    isSaving,
    onSave
}: TransmutationTabProps) {
    const methods = useForm<TransmutationFormValues>({
        defaultValues: {
            rows: initialRows.length > 0
                ? initialRows
                : []
        },
        mode: 'all'
    });

    const { fields, append, remove } = useFieldArray({
        control: methods.control,
        name: 'rows'
    });

    function handleSave() {
        methods.handleSubmit(
            async function(values) {
                await onSave(values.rows);
            },
            function(errors) {
                const error = checkForMessage(errors);

                if (error.firstError?.message) {
                    useToastStore.getState()
                        .showToast(error.firstError.message, 'error');
                }
                setTimeout(function() {
                    const el = document.querySelector<HTMLInputElement>('.ag-cell input[aria-invalid="true"]');
                    el?.focus();
                }, 50);
            }
        )();
    }

    return (
        <CommonFormTableCard<TransmutationRow, TransmutationFormValues>
            cardProps={{
                cardHeaderProps: {
                    subheader: 'Map percentage ranges to their equivalent 1.0–5.0 transmuted grades.',
                    title: 'Transmutation Table'
                }
            }}
            controlProps={{
                tableButtonsProps: {
                    extraButtons: (
                        <CommonButton
                            disabled={isSaving}
                            size="small"
                            variant="contained"
                            onClick={handleSave}
                        >
                            {isSaving
                                ? 'Saving...'
                                : 'Save'}
                        </CommonButton>
                    )
                }
            }}
            formTableProps={{
                columns: COLUMNS,
                control: methods.control,
                emptyDataMessage: 'No transmutation rows yet. Click + to add one.',
                fieldArrayName: 'rows',
                tableProps: {
                    containerClassName: 'h-full w-full'
                },
                rows: fields as unknown as (TransmutationRow & { id: string })[],
                onAddRow: function() {
                    append(DEFAULT_ROW);
                },
                onRemoveRow: remove
            }}
        />
    );
}
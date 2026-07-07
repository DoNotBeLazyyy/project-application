import CommonButton from '@components/button/CommonButton';
import { FormField } from '@components/form/FormField';
import CommonFormTableCard from '@components/table-card/CommonFormTableCard';
import { CommonFormTableCellParams, CommonFormTableColumn } from '@components/table/CommonFormTable';
import { TransmutationRow } from '@type/grading-config.type';
import { formErrors } from '@utils/form.util';
import {
    Control, FieldValues, useFieldArray, useForm, useWatch
} from 'react-hook-form';

interface TransmutationFormValues extends FieldValues {
    rows: TransmutationRow[];
}

interface LadderRung {
    transmuted_grade: string;
    min_percentage: string;
    description: string;
}

const FAIL_GRADE = 5;

const DEFAULT_LADDER: LadderRung[] = [
    { transmuted_grade: '1.00', min_percentage: '98', description: 'Excellent' },
    { transmuted_grade: '1.25', min_percentage: '95', description: 'Superior' },
    { transmuted_grade: '1.50', min_percentage: '92', description: 'Very Good' },
    { transmuted_grade: '1.75', min_percentage: '89', description: 'Good' },
    { transmuted_grade: '2.00', min_percentage: '86', description: 'Meritorious' },
    { transmuted_grade: '2.25', min_percentage: '83', description: 'Very Satisfactory' },
    { transmuted_grade: '2.50', min_percentage: '80', description: 'Satisfactory' },
    { transmuted_grade: '2.75', min_percentage: '77', description: 'Fairly Satisfactory' },
    { transmuted_grade: '3.00', min_percentage: '75', description: 'Passing' },
    { transmuted_grade: '5.00', min_percentage: '0', description: 'Failed' }
];

interface LadderError {
    index: number;
    message: string;
}

function toGradeLabel(value: string): string {
    const grade = Number(value);

    return Number.isNaN(grade)
        ? value
        : grade.toFixed(2);
}

function deriveMax(rows: TransmutationRow[], index: number): number | null {
    if (index === 0) {
        return 100;
    }

    const previousFloor = Number(rows[index - 1]?.min_percentage);

    if (Number.isNaN(previousFloor) || rows[index - 1]?.min_percentage === '') {
        return null;
    }

    return previousFloor - 1;
}

function validateLadder(rows: TransmutationRow[]): LadderError | null {
    for (let index = 0; index < rows.length; index += 1) {
        const grade = Number(rows[index].transmuted_grade);
        const floor = Number(rows[index].min_percentage);

        if (grade === FAIL_GRADE) {
            if (floor !== 0) {
                return { index, message: 'The 5.00 (Failed) floor must be 0.' };
            }
            continue;
        }

        if (rows[index].min_percentage === '' || Number.isNaN(floor)) {
            return { index, message: `Enter a minimum % for grade ${toGradeLabel(rows[index].transmuted_grade)}.` };
        }

        if (floor < 0 || floor > 100) {
            return { index, message: `Grade ${toGradeLabel(rows[index].transmuted_grade)} floor must be between 0 and 100.` };
        }

        if (!Number.isInteger(floor)) {
            return { index, message: `Grade ${toGradeLabel(rows[index].transmuted_grade)} floor must be a whole number.` };
        }
    }

    for (let index = 0; index < rows.length - 1; index += 1) {
        const currentFloor = Number(rows[index].min_percentage);

        if (Number(rows[index + 1].transmuted_grade) === FAIL_GRADE) {
            if (currentFloor <= 0) {
                return { index, message: `Grade ${toGradeLabel(rows[index].transmuted_grade)} floor must be greater than 0.` };
            }
            break;
        }

        if (currentFloor <= Number(rows[index + 1].min_percentage)) {
            return {
                index,
                message: `Grade ${toGradeLabel(rows[index].transmuted_grade)} floor must be higher than grade ${toGradeLabel(rows[index + 1].transmuted_grade)}'s floor.`
            };
        }
    }

    return null;
}

function buildInitialRows(initialRows: TransmutationRow[]): TransmutationRow[] {
    if (initialRows.length === DEFAULT_LADDER.length) {
        return [...initialRows].sort((a, b) => Number(a.transmuted_grade) - Number(b.transmuted_grade));
    }

    return DEFAULT_LADDER.map((rung) => ({
        transmuted_grade: rung.transmuted_grade,
        min_percentage: rung.min_percentage,
        max_percentage: '',
        description: rung.description
    }));
}

function GradeCell({ value }: { value: string }) {
    return (
        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
            {toGradeLabel(value)}
        </span>
    );
}

function DescriptionCell({ value }: { value: string }) {
    return (
        <span className="text-(--mui-palette-text-secondary) text-sm">
            {value}
        </span>
    );
}

function DerivedMaxCell({ control, rowIndex }: { control: Control<TransmutationFormValues>; rowIndex: number }) {
    const rows = useWatch({ control, name: 'rows' }) as TransmutationRow[] | undefined;
    const derived = rows
        ? deriveMax(rows, rowIndex)
        : null;
    const currentFloor = Number(rows?.[rowIndex]?.min_percentage);
    const isInvalid = derived !== null
        && !Number.isNaN(currentFloor)
        && derived < currentFloor;

    return (
        <span
            className={isInvalid
                ? 'text-(--mui-palette-error-main) text-sm'
                : 'text-(--mui-palette-text-secondary) text-sm'}
        >
            {derived === null
                ? '—'
                : String(derived)}
        </span>
    );
}

function MinFloorCell({ control, fieldName, isFixedZero }: { control: Control<TransmutationFormValues>; fieldName: string; isFixedZero: boolean }) {
    if (isFixedZero) {
        return (
            <span className="text-(--mui-palette-text-secondary) text-sm">
                0
            </span>
        );
    }

    return (
        <FormField
            control={control as unknown as Control<FieldValues>}
            field={{
                type: 'number',
                name: fieldName,
                fieldProps: {
                    max: 100,
                    maxDecimals: 0,
                    maxDigits: 3,
                    min: 0,
                    size: 'small'
                },
                rules: {
                    required: 'Required',
                    min: { value: 0, message: '0–100' },
                    max: { value: 100, message: '0–100' }
                }
            }}
            hasHelper
        />
    );
}

const COLUMNS: CommonFormTableColumn<TransmutationRow, TransmutationFormValues>[] = [
    {
        key: 'transmuted_grade',
        headerName: 'Grade',
        flex: 1,
        renderCell: (params: CommonFormTableCellParams<TransmutationFormValues>) => (
            <GradeCell value={params.data.transmuted_grade} />
        )
    },
    {
        key: 'min_percentage',
        headerName: 'Min %',
        flex: 1,
        renderCell: (params: CommonFormTableCellParams<TransmutationFormValues>) => (
            <MinFloorCell
                control={params.control}
                fieldName={params.fieldName}
                isFixedZero={Number(params.data.transmuted_grade) === FAIL_GRADE}
            />
        )
    },
    {
        key: 'max_percentage',
        headerName: 'Max % (auto)',
        flex: 1,
        renderCell: (params: CommonFormTableCellParams<TransmutationFormValues>) => (
            <DerivedMaxCell
                control={params.control}
                rowIndex={params.rowIndex}
            />
        )
    },
    {
        key: 'description',
        headerName: 'Description',
        flex: 2,
        renderCell: (params: CommonFormTableCellParams<TransmutationFormValues>) => (
            <DescriptionCell value={params.data.description} />
        )
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
            rows: buildInitialRows(initialRows)
        },
        mode: 'all'
    });

    const { fields } = useFieldArray({
        control: methods.control,
        name: 'rows'
    });

    function handleSave() {
        methods.handleSubmit(
            async function(values) {
                methods.clearErrors();
                const ladderError = validateLadder(values.rows);

                if (ladderError) {
                    const fieldName = `rows.${ladderError.index}.min_percentage` as `rows.${number}.min_percentage`;

                    methods.setError(fieldName, {
                        type: 'manual',
                        message: ladderError.message
                    });
                    methods.setFocus(fieldName);
                    return;
                }

                await onSave(values.rows);
            },
            function(errors) {
                formErrors(errors, methods);
            }
        )();
    }

    return (
        <CommonFormTableCard<TransmutationRow, TransmutationFormValues>
            cardProps={{
                cardHeaderProps: {
                    subheader: 'Enter the minimum % for each grade. The max is derived automatically so ranges never overlap or leave gaps.',
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
                emptyDataMessage: 'No transmutation rows.',
                fieldArrayName: 'rows',
                hideRowActions: true,
                tableProps: {
                    containerClassName: 'h-full w-full'
                },
                rows: fields as unknown as (TransmutationRow & { id: string })[]
            }}
        />
    );
}
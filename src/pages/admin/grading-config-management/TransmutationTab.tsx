import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import FormErrorSummary from '@components/form/FormErrorSummary';
import { FormField } from '@components/form/FormField';
import CommonTable from '@components/table/CommonTable';
import { FloppyDiskIcon, LockSimpleIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { TransmutationRow } from '@type/grading-config.type';
import { MobileCardColDef } from '@type/table.type';
import { formErrors } from '@utils/form.util';
import { ICellRendererParams } from 'ag-grid-community';
import { useEffect, useMemo, useState } from 'react';
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
    tier: string;
}

const FAIL_GRADE = 5;

const INFO_CONTENT = 'Enter the minimum % that earns each grade. Every maximum is derived from the floor above it, so the ladder from 1.00 down to 5.00 never overlaps and never leaves a gap.';

const DEFAULT_LADDER: LadderRung[] = [
    { transmuted_grade: '1.00', min_percentage: '98', description: 'Excellent', tier: 'With Highest Honors' },
    { transmuted_grade: '1.25', min_percentage: '95', description: 'Superior', tier: 'With High Honors' },
    { transmuted_grade: '1.50', min_percentage: '92', description: 'Very Good', tier: 'With Honors' },
    { transmuted_grade: '1.75', min_percentage: '89', description: 'Good', tier: 'With Honors' },
    { transmuted_grade: '2.00', min_percentage: '86', description: 'Meritorious', tier: 'Very Satisfactory' },
    { transmuted_grade: '2.25', min_percentage: '83', description: 'Very Satisfactory', tier: 'Satisfactory' },
    { transmuted_grade: '2.50', min_percentage: '80', description: 'Satisfactory', tier: 'Satisfactory' },
    { transmuted_grade: '2.75', min_percentage: '77', description: 'Fairly Satisfactory', tier: 'Fair' },
    { transmuted_grade: '3.00', min_percentage: '75', description: 'Passing', tier: 'Minimum Pass' },
    { transmuted_grade: '5.00', min_percentage: '0', description: 'Failed', tier: 'No Credit' }
];

const TIER_BY_GRADE = new Map(
    DEFAULT_LADDER.map((rung) => [rung.transmuted_grade, rung.tier])
);

function toGradeLabel(value: string | number): string {
    const grade = Number(value);

    return Number.isNaN(grade)
        ? String(value)
        : grade.toFixed(2);
}

/**
 * The rail colour encodes the descent from honors to failure, so a glance down
 * the column reads as a gradient rather than ten unrelated rows.
 */
function railColor(value: string | number): string {
    const grade = Number(value);

    if (grade >= FAIL_GRADE) {
        return 'var(--mui-tokens-color-red-500)';
    }

    if (grade >= 3) {
        return 'var(--mui-tokens-color-yellow-700)';
    }

    if (grade >= 2.5) {
        return 'var(--mui-tokens-color-yellow-500)';
    }

    if (grade >= 1.75) {
        return 'var(--mui-tokens-color-brand-500)';
    }

    return 'var(--mui-tokens-color-brand-800)';
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

/**
 * Validates one floor against the whole ladder. React Hook Form hands the live
 * form values to `validate`, so each row can check itself against its neighbour
 * without the rule closing over stale state.
 */
function validateFloor(
    value: string | number,
    formValues: TransmutationFormValues,
    index: number
): string | true {
    const floor = Number(value);

    if (value === '' || value === null || Number.isNaN(floor)) {
        return 'Required';
    }

    if (!Number.isInteger(floor)) {
        return 'Whole numbers only';
    }

    if (floor < 0 || floor > 100) {
        return 'Must be 0–100';
    }

    const next = formValues.rows?.[index + 1];

    if (!next) {
        return true;
    }

    if (Number(next.transmuted_grade) === FAIL_GRADE) {
        return floor > 0
            ? true
            : 'Must be above 0';
    }

    const nextFloor = Number(next.min_percentage);

    if (next.min_percentage === '' || Number.isNaN(nextFloor)) {
        return true;
    }

    return floor > nextFloor
        ? true
        : `Must exceed ${toGradeLabel(next.transmuted_grade)}'s floor (${nextFloor})`;
}

/**
 * Normalises a floor for comparison. The number input emits numbers (and
 * `undefined` when cleared) while the loaded table holds strings, so React Hook
 * Form's own `isDirty` sees `98 !== '98'` and stays true even after the user
 * types a value back to what it was. Comparing normalised floors is what makes
 * "no real changes" mean no changes.
 */
function toComparableFloor(value: string | number | undefined | null): string {
    if (value === '' || value === null || value === undefined) {
        return '';
    }

    const numeric = Number(value);

    return Number.isNaN(numeric)
        ? String(value)
        : String(numeric);
}

function buildInitialRows(initialRows: TransmutationRow[]): TransmutationRow[] {
    const rows = initialRows.length === DEFAULT_LADDER.length
        ? [...initialRows].sort((a, b) => Number(a.transmuted_grade) - Number(b.transmuted_grade))
        : DEFAULT_LADDER.map((rung) => ({
            transmuted_grade: rung.transmuted_grade,
            min_percentage: rung.min_percentage,
            max_percentage: '',
            description: rung.description
        }));

    // The 5.00 floor is shown as a locked 0, so pin the value to match. Stored
    // data that disagrees would otherwise be saved back as the hidden number.
    return rows.map((row) => (Number(row.transmuted_grade) === FAIL_GRADE
        ? { ...row, min_percentage: '0' }
        : row));
}

interface TransmutationCellParams extends ICellRendererParams<TransmutationRow> {
    control: Control<TransmutationFormValues>;
    isEditing: boolean;
}

function GradeCell({ data }: TransmutationCellParams) {
    const isFail = Number(data?.transmuted_grade) === FAIL_GRADE;

    return (
        <div className="flex gap-3 h-full items-center">
            <span
                className="h-9 rounded-full shrink-0 w-1"
                style={{ backgroundColor: railColor(data?.transmuted_grade ?? '') }}
            />
            <span className="flex flex-col">
                <span className="font-bold font-mono leading-none tabular-nums text-(--mui-palette-text-primary) text-sm">
                    {toGradeLabel(data?.transmuted_grade ?? '')}
                </span>
                {/* Only the failing rung is labelled - the column header already
                    says "Grade", so tagging every other row repeats it. */}
                {isFail && (
                    <span className="mt-1 text-[0.625rem] text-(--mui-palette-error-main) tracking-wider uppercase">
                        Fail
                    </span>
                )}
            </span>
        </div>
    );
}

function MinFloorCell({ control, data, isEditing, node }: TransmutationCellParams) {
    const index = node.rowIndex ?? 0;

    // The 5.00 floor is fixed at zero. It is styled to the exact metrics of a
    // small disabled input so the column reads as one consistent stack.
    if (Number(data?.transmuted_grade) === FAIL_GRADE) {
        return (
            <span className="bg-(--mui-tokens-color-neutral-200) flex font-mono gap-1.5 h-9 items-center pointer-coarse:h-11 px-(--mui-tokens-spacing-3) rounded-(--mui-tokens-radius-md) text-(--mui-tokens-color-neutral-400) text-sm w-full">
                <LockSimpleIcon size={14} weight="bold" />
                0
            </span>
        );
    }

    return (
        <FormField
            control={control as unknown as Control<FieldValues>}
            field={{
                type: 'number',
                name: `rows.${index}.min_percentage`,
                disabled: !isEditing,
                fieldProps: {
                    max: 100,
                    maxDecimals: 0,
                    maxDigits: 3,
                    min: 0,
                    size: 'small'
                },
                rules: {
                    required: 'Required',
                    validate: function(value, formValues) {
                        return validateFloor(
                            value as string,
                            formValues as TransmutationFormValues,
                            index
                        );
                    }
                }
            }}
            hasHelper
        />
    );
}

function DerivedMaxCell({ control, node }: TransmutationCellParams) {
    const index = node.rowIndex ?? 0;
    const rows = useWatch({ control, name: 'rows' }) as TransmutationRow[] | undefined;
    const derived = rows
        ? deriveMax(rows, index)
        : null;
    const currentFloor = Number(rows?.[index]?.min_percentage);
    const isInverted = derived !== null
        && !Number.isNaN(currentFloor)
        && derived < currentFloor;

    return (
        <span
            className={isInverted
                ? 'font-mono tabular-nums text-(--mui-palette-error-main) text-sm'
                : 'font-mono tabular-nums text-(--mui-palette-text-secondary) text-sm'}
        >
            {derived === null
                ? '—'
                : String(derived)}
        </span>
    );
}

function DescriptionCell({ data }: TransmutationCellParams) {
    return (
        <span className="flex flex-col">
            <span className="text-(--mui-palette-text-primary) text-sm">
                {data?.description}
            </span>
            <span className="mt-0.5 text-[0.625rem] text-(--mui-palette-text-secondary) tracking-wider uppercase">
                {TIER_BY_GRADE.get(toGradeLabel(data?.transmuted_grade ?? '')) ?? ''}
            </span>
        </span>
    );
}

/**
 * Plots the row's band on the 0-100 scale. Stacked down the column the bands
 * make the "no overlaps, no gaps" rule visible instead of merely asserted.
 */
function RangeCell({ control, data, node }: TransmutationCellParams) {
    const index = node.rowIndex ?? 0;
    const rows = useWatch({ control, name: 'rows' }) as TransmutationRow[] | undefined;
    const isFail = Number(data?.transmuted_grade) === FAIL_GRADE;
    const derived = rows
        ? deriveMax(rows, index)
        : null;
    const floor = isFail
        ? 0
        : Number(rows?.[index]?.min_percentage);
    const hasFloor = !Number.isNaN(floor);
    const low = hasFloor
        ? Math.min(100, Math.max(0, floor))
        : 0;
    const high = derived === null
        ? low
        : Math.min(100, Math.max(0, derived));
    const isBroken = derived !== null && hasFloor && derived < floor;

    return (
        <span className="flex flex-col gap-1 w-full">
            <span className="bg-(--mui-palette-grey-100) block h-2 overflow-hidden relative rounded-full w-full">
                <span
                    className="absolute block bottom-0 rounded-full top-0"
                    style={{
                        backgroundColor: isBroken
                            ? 'var(--mui-palette-error-main)'
                            : railColor(data?.transmuted_grade ?? ''),
                        left: `${Math.min(low, high)}%`,
                        right: `${100 - Math.max(low, high)}%`
                    }}
                />
            </span>
            <span
                className={isBroken
                    ? 'flex font-mono justify-between tabular-nums text-(--mui-palette-error-main) text-[0.625rem]'
                    : 'flex font-mono justify-between tabular-nums text-(--mui-palette-text-secondary) text-[0.625rem]'}
            >
                <span>
                    {hasFloor
                        ? low
                        : '?'}
                </span>
                <span>
                    {derived === null
                        ? '?'
                        : derived}
                </span>
            </span>
        </span>
    );
}

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
    const hasStoredTable = initialRows.length === DEFAULT_LADDER.length;

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

    const watchedRows = useWatch({ control: methods.control, name: 'rows' });
    const { defaultValues, isDirty } = methods.formState;

    // Only the floors are editable, so a real change is a floor that no longer
    // matches the saved table. `reset` moves the baseline, so this clears after
    // a save and after Cancel too.
    const hasRealChanges = useMemo(function() {
        const baseline = (defaultValues?.rows ?? []) as TransmutationRow[];

        return (watchedRows ?? []).some(function(row, index) {
            return toComparableFloor(row?.min_percentage)
                !== toComparableFloor(baseline[index]?.min_percentage);
        });
    }, [defaultValues, watchedRows]);

    // The table opens read-only. Editing a grading scale mid-term re-grades every
    // enrolled student, so it takes a deliberate step into edit mode first.
    const [isEditing, setIsEditing] = useState(false);

    // A floor is only valid relative to the row below it, so editing one row can
    // fix or break its neighbour. Re-run every floor whenever any of them moves.
    useEffect(function() {
        if (!isDirty) {
            return;
        }

        methods.trigger(
            fields.map((_, index) => `rows.${index}.min_percentage` as const)
        );
    }, [fields, isDirty, methods, watchedRows]);

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        const cellRendererParams = { control: methods.control, isEditing };

        return [
            {
                cellRenderer: GradeCell,
                cellRendererParams,
                field: 'transmuted_grade',
                headerName: 'Grade',
                // Frozen at every screen size: once the grid scrolls sideways the
                // grade is the only thing identifying which row you are editing.
                lockPinned: true,
                maxWidth: 130,
                minWidth: 110,
                pinned: 'left'
            },
            {
                cellRenderer: MinFloorCell,
                cellRendererParams,
                field: 'min_percentage',
                headerName: 'Minimum %',
                maxWidth: 200,
                minWidth: 150
            },
            {
                cellRenderer: DerivedMaxCell,
                cellRendererParams,
                field: 'max_percentage',
                headerName: 'Max % (auto)',
                maxWidth: 140,
                minWidth: 110
            },
            {
                cellRenderer: DescriptionCell,
                cellRendererParams,
                field: 'description',
                flex: 1,
                headerName: 'Description',
                minWidth: 170
            },
            {
                cellRenderer: RangeCell,
                cellRendererParams,
                colId: 'range',
                headerName: 'Range on 0–100',
                maxWidth: 220,
                minWidth: 160
            }
        ];
    }, [isEditing, methods.control]);

    function handleStartEdit() {
        setIsEditing(true);
    }

    function handleCancelEdit() {
        methods.reset();
        setIsEditing(false);
    }

    function handleSave() {
        methods.handleSubmit(
            async function(values) {
                await onSave(values.rows);
                methods.reset(values);
                setIsEditing(false);
            },
            function(errors) {
                formErrors(errors, methods);
            }
        )();
    }

    return (
        <div className="flex flex-col gap-3 h-full min-h-0">
            <FormErrorSummary
                className="shrink-0"
                control={methods.control}
            />
            <CommonCard
                cardHeaderProps={{
                    /*
                     * The `@max-*` thresholds are the widths at which the header
                     * can no longer hold the title and these controls on one
                     * line. Past that the controls wrap, and a button marooned at
                     * the end of its own row reads as a mistake - so they stretch
                     * to fill the row instead. Each threshold sits just under its
                     * true wrap point: too low only costs the stretch in a narrow
                     * band, while too high would stretch a button still inline.
                     */
                    action: isEditing
                        ? (
                            <div className="flex gap-(--mui-tokens-spacing-3) items-center justify-end w-full">
                                <CommonButton
                                    className="@max-[26rem]:flex-1"
                                    color="secondary"
                                    disabled={isSaving}
                                    size="small"
                                    variant="outlined"
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </CommonButton>
                                <CommonButton
                                    className="@max-[26rem]:flex-1"
                                    disabled={hasStoredTable && !hasRealChanges}
                                    loading={isSaving}
                                    size="small"
                                    startIcon={<FloppyDiskIcon size={16} weight="bold" />}
                                    variant="contained"
                                    onClick={handleSave}
                                >
                                    {isSaving
                                        ? 'Saving...'
                                        : 'Save'}
                                </CommonButton>
                            </div>
                        )
                        : (
                            <CommonButton
                                className="@max-[21rem]:w-full"
                                size="small"
                                startIcon={<PencilSimpleIcon size={16} weight="bold" />}
                                variant="contained"
                                onClick={handleStartEdit}
                            >
                                Edit
                            </CommonButton>
                        ),
                    className: '@container shrink-0',
                    // The shared header drops its action onto its own line below
                    // `md`. There is room for both here, so let the action sit
                    // inline and wrap only when the title genuinely crowds it.
                    // `&&` outweighs the slot's own `flexBasis: 100%`, which the
                    // theme applies inside a `down('md')` media query.
                    sx: {
                        gap: 'var(--mui-tokens-spacing-5)',
                        '&& .MuiCardHeader-action': {
                            display: 'flex',
                            flexBasis: 'auto',
                            flexGrow: 1,
                            justifyContent: 'flex-end',
                            marginLeft: 'auto'
                        }
                    },
                    title: 'Transmutation Table'
                }}
                className="flex flex-1 flex-col h-full min-h-0 w-full"
                infoContent={INFO_CONTENT}
            >
                <CommonTable<TransmutationRow>
                    containerClassName="common_form_grid flex-1"
                    isMobileCardDisabled
                    leadingColumnDefs={columnDefs}
                    rowData={fields as unknown as TransmutationRow[]}
                    rowHeight={84}
                    suppressRowVirtualisation
                />
            </CommonCard>
        </div>
    );
}
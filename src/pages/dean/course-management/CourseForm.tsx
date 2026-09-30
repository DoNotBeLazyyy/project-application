import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonStepperInput from '@components/input/CommonStepperInput';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import CommonFormTable, { CommonFormTableColumn } from '@components/table/CommonFormTable';
import { PREREQUISITE_KIND_OPTIONS, PREREQUISITE_TYPE_OPTIONS, YEAR_LEVEL_STANDING_OPTIONS } from '@constants/course.constant';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useCourseTypeOptions } from '@pages/dean/course-management/type/useCourseTypeOptions';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { normalizeMinimumGrade, useMinimumGradeOptions } from '@pages/dean/course-management/useMinimumGradeOptions';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    FileTextIcon,
    GitForkIcon
} from '@phosphor-icons/react';
import { ComponentPropsForm } from '@type/common.type';
import { CourseFormValues, CourseTypeRow, PrerequisiteRow } from '@type/course/course.type';
import { useEffect, useState } from 'react';
import {
    Control, FieldPath, useController, useFieldArray, useFormState, useWatch
} from 'react-hook-form';

type PrerequisiteField =
    | 'prerequisite_kind'
    | 'course_id'
    | 'prerequisite_type'
    | 'year_level_required'
    | 'minimum_grade';

function prerequisiteName(index: number, field: PrerequisiteField): FieldPath<CourseFormValues> {
    return `prerequisites.${index}.${field}` as FieldPath<CourseFormValues>;
}

function courseTypeName<T extends keyof CourseTypeRow>(index: number, field: T): FieldPath<CourseFormValues> {
    return `course_types.${index}.${field}` as FieldPath<CourseFormValues>;
}

interface PrerequisiteCellProps {
    control: Control<CourseFormValues>;
    disabled?: boolean;
    rowIndex: number;
}

function PrerequisiteKindCell({ control, disabled, rowIndex }: PrerequisiteCellProps) {
    const kind = useController({ control, name: prerequisiteName(rowIndex, 'prerequisite_kind') });
    const courseId = useController({ control, name: prerequisiteName(rowIndex, 'course_id') });
    const yearLevel = useController({ control, name: prerequisiteName(rowIndex, 'year_level_required') });
    const minimumGrade = useController({ control, name: prerequisiteName(rowIndex, 'minimum_grade') });

    return (
        <CommonSelect
            disabled={disabled}
            fullWidth
            options={PREREQUISITE_KIND_OPTIONS}
            size="small"
            value={String(kind.field.value ?? '')}
            onChange={(e) => {
                kind.field.onChange(e.target.value);
                courseId.field.onChange('');
                yearLevel.field.onChange('');
                minimumGrade.field.onChange('');
            }}
        />
    );
}

interface PrerequisiteTargetCellProps extends PrerequisiteCellProps {
    courseOptions: CommonSelectOption[];
}

function PrerequisiteTargetCell({ control, courseOptions, disabled, rowIndex }: PrerequisiteTargetCellProps) {
    const kind = useWatch({ control, name: prerequisiteName(rowIndex, 'prerequisite_kind') });
    const prerequisites = useWatch({ control, name: 'prerequisites' });
    const yearLevel = useController({ control, name: prerequisiteName(rowIndex, 'year_level_required') });
    const courseId = useController({ control, name: prerequisiteName(rowIndex, 'course_id') });

    if (kind === 'standing') {
        return (
            <CommonSelect
                disabled={disabled}
                fullWidth
                options={YEAR_LEVEL_STANDING_OPTIONS}
                size="small"
                value={String(yearLevel.field.value ?? '')}
                onChange={(e) => yearLevel.field.onChange(e.target.value)}
            />
        );
    }

    const selectedInOtherRows = (prerequisites ?? [])
        .filter((prereq, i) => i !== rowIndex && prereq.prerequisite_kind === 'course')
        .map((prereq) => prereq.course_id)
        .filter(Boolean);

    const availableOptions = courseOptions.filter(
        (option) => !selectedInOtherRows.includes(String(option.value))
    );

    return (
        <CommonSelect
            disabled={disabled}
            fullWidth
            options={availableOptions}
            size="small"
            value={String(courseId.field.value ?? '')}
            onChange={(e) => courseId.field.onChange(e.target.value)}
        />
    );
}

function PrerequisiteTypeCell({ control, disabled, rowIndex }: PrerequisiteCellProps) {
    const type = useController({ control, name: prerequisiteName(rowIndex, 'prerequisite_type') });
    const minimumGrade = useController({ control, name: prerequisiteName(rowIndex, 'minimum_grade') });

    return (
        <CommonSelect
            disabled={disabled}
            fullWidth
            options={PREREQUISITE_TYPE_OPTIONS}
            size="small"
            value={String(type.field.value ?? '')}
            onChange={(e) => {
                type.field.onChange(e.target.value);
                if (e.target.value === 'Co-requisite') minimumGrade.field.onChange('');
            }}
        />
    );
}

interface PrerequisiteMinGradeCellProps extends PrerequisiteCellProps {
    minimumGradeOptions: CommonSelectOption[];
}

function PrerequisiteMinGradeCell({
    control,
    disabled,
    minimumGradeOptions,
    rowIndex
}: PrerequisiteMinGradeCellProps) {
    const kind = useWatch({ control, name: prerequisiteName(rowIndex, 'prerequisite_kind') });
    const type = useWatch({ control, name: prerequisiteName(rowIndex, 'prerequisite_type') });
    const minimumGrade = useController({ control, name: prerequisiteName(rowIndex, 'minimum_grade') });

    const isLocked = type === 'Co-requisite' || kind === 'standing';

    return (
        <CommonSelect
            disabled={disabled || isLocked}
            fullWidth
            options={minimumGradeOptions}
            size="small"
            value={isLocked
                ? ''
                : normalizeMinimumGrade(minimumGrade.field.value)}
            onChange={(e) => minimumGrade.field.onChange(e.target.value)}
        />
    );
}

// Course Type Table Components
interface CourseTypeCellProps {
    control: Control<CourseFormValues>;
    disabled?: boolean;
    rowIndex: number;
    courseTypeOptions: CommonSelectOption[];
}

function CourseTypeSelectionCell({ control, disabled, rowIndex, courseTypeOptions }: CourseTypeCellProps) {
    const courseType = useController({ control, name: courseTypeName(rowIndex, 'course_type_id') });
    const courseTypes = useWatch({ control, name: 'course_types' }) || [];

    const selectedInOtherRows = courseTypes
        .filter((_, i) => i !== rowIndex)
        .map((ct) => ct.course_type_id)
        .filter(Boolean);

    // Whenever a course type is selected in another row, remove it from remaining options
    const availableOptions = courseTypeOptions.filter(
        (option) => !selectedInOtherRows.includes(String(option.value))
    );

    return (
        <CommonSelect
            disabled={disabled}
            fullWidth
            options={availableOptions}
            placeholder="Select Course Type"
            size="small"
            value={String(courseType.field.value ?? '')}
            onChange={(e) => courseType.field.onChange(e.target.value)}
        />
    );
}

function CourseTypeUnitsCell({ control, disabled, rowIndex }: Omit<CourseTypeCellProps, 'courseTypeOptions'>) {
    const units = useController({ control, name: courseTypeName(rowIndex, 'units') });

    return (
        <CommonStepperInput
            disabled={disabled}
            min={0}
            max={10}
            step={0.5}
            value={Number(units.field.value ?? 0)}
            onChange={(val) => units.field.onChange(val)}
        />
    );
}

function CourseTypeCreditHoursCell({ control, disabled, rowIndex }: Omit<CourseTypeCellProps, 'courseTypeOptions'>) {
    const creditHours = useController({ control, name: courseTypeName(rowIndex, 'credit_hours') });

    return (
        <CommonStepperInput
            disabled={disabled}
            min={0}
            max={20}
            step={0.5}
            value={Number(creditHours.field.value ?? 0)}
            onChange={(val) => creditHours.field.onChange(val)}
        />
    );
}

interface CourseFormProps extends ComponentPropsForm {
    control: Control<CourseFormValues>;
    disabled?: boolean;
    excludeCourseId?: string;
    isCodeDisabled?: boolean;
}

export const COURSE_FORM_STEPS = [
    {
        id: 1,
        title: 'Overview Data',
        label: 'Overview Data',
        subtitle: 'General info, course title, code & department',
        icon: FileTextIcon
    },
    {
        id: 2,
        title: 'Course Type',
        label: 'Course Type',
        subtitle: 'Course type units & credit hours breakdown',
        icon: BookOpenIcon
    },
    {
        id: 3,
        title: 'Prerequisite',
        label: 'Prerequisite',
        subtitle: 'Required subjects & standing prerequisites',
        icon: GitForkIcon
    }
];

export default function CourseForm({
    control,
    disabled,
    excludeCourseId,
    isCodeDisabled,
    ...formProps
}: CourseFormProps) {
    const [activeStep, setActiveStep] = useState<number>(1);
    const { errors } = useFormState({ control });

    const prerequisites = useWatch({ control, name: 'prerequisites' });
    const courseTypes = useWatch({ control, name: 'course_types' }) || [];

    const { departmentOptions } = useDepartmentOptions();
    const { courseTypeOptions } = useCourseTypeOptions();
    const { minimumGradeOptions } = useMinimumGradeOptions();
    const { courseOptions: allCourseOptions } = useCourseOptions({
        excludeIds: [excludeCourseId].filter((id): id is string => !!id)
    });

    const {
        fields: courseTypeFields,
        append: appendCourseType,
        remove: removeCourseType
    } = useFieldArray({
        control,
        name: 'course_types'
    });

    const {
        fields: prereqFields,
        append: appendPrereq,
        remove: removePrereq
    } = useFieldArray({
        control,
        name: 'prerequisites'
    });

    // Automatically switch active step to the first step containing validation errors upon form submit
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            if (errors.title || errors.code || errors.department_id || errors.description || errors.is_active) {
                setActiveStep(1);
            } else if (errors.course_types) {
                setActiveStep(2);
            } else if (errors.prerequisites) {
                setActiveStep(3);
            }
        }
    }, [errors]);

    // Calculate total units dynamically as sum of selected course types' units
    const totalUnits = courseTypes.reduce((acc, curr) => acc + (Number(curr.units) || 0), 0);
    const totalCreditHours = courseTypes.reduce((acc, curr) => acc + (Number(curr.credit_hours) || 0), 0);

    const fields_config: FormFieldConfig<CourseFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: 'Full course title' },
            name: 'title',
            rules: disabled
                ? undefined
                : { required: 'Course title is required' },
            type: 'text',
            gridCols: 3
        },
        {
            disabled: disabled || isCodeDisabled,
            fieldProps: { helperText: 'Unique course code, e.g. CS101' },
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Course code is required' },
            type: 'text',
            gridCols: 3
        },
        {
            disabled,
            fieldProps: { helperText: 'Department that owns this course' },
            name: 'department_id',
            options: departmentOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a department' },
            type: 'select',
            gridCols: 3
        },
        {
            disabled,
            items: [
                { name: 'is_active' as const, label: 'Active Course' }
            ],
            name: 'is_active',
            type: 'checkbox-group',
            gridCols: 3
        },
        {
            disabled,
            fieldProps: {
                helperText: 'Optional course description',
                placeholder: 'Enter a short description of this course'
            },
            name: 'description',
            type: 'text-area',
            gridCols: 6
        }
    ];

    const courseTypeColumns: CommonFormTableColumn<CourseTypeRow, CourseFormValues>[] = [
        {
            key: 'course_type_id',
            headerName: 'Course Type',
            flex: 4,
            renderCell: (params) => (
                <CourseTypeSelectionCell
                    control={params.control}
                    disabled={params.disabled}
                    rowIndex={params.rowIndex}
                    courseTypeOptions={courseTypeOptions}
                />
            )
        },
        {
            key: 'units',
            headerName: 'Units',
            flex: 3,
            renderCell: (params) => (
                <CourseTypeUnitsCell
                    control={params.control}
                    disabled={params.disabled}
                    rowIndex={params.rowIndex}
                />
            )
        },
        {
            key: 'credit_hours',
            headerName: 'Credit Hours',
            flex: 3,
            renderCell: (params) => (
                <CourseTypeCreditHoursCell
                    control={params.control}
                    disabled={params.disabled}
                    rowIndex={params.rowIndex}
                />
            )
        }
    ];

    const prerequisiteColumns: CommonFormTableColumn<PrerequisiteRow, CourseFormValues>[] = [
        {
            key: 'prerequisite_kind',
            headerName: 'Kind',
            flex: 2,
            renderCell: (params) => (
                <PrerequisiteKindCell
                    control={params.control}
                    disabled={params.disabled}
                    rowIndex={params.rowIndex}
                />
            )
        },
        {
            key: 'course_id',
            headerName: 'Course / Year Level',
            flex: 4,
            renderCell: (params) => (
                <PrerequisiteTargetCell
                    control={params.control}
                    courseOptions={allCourseOptions}
                    disabled={params.disabled}
                    rowIndex={params.rowIndex}
                />
            )
        },
        {
            key: 'prerequisite_type',
            headerName: 'Type',
            flex: 2,
            renderCell: (params) => (
                <PrerequisiteTypeCell
                    control={params.control}
                    disabled={params.disabled}
                    rowIndex={params.rowIndex}
                />
            )
        },
        {
            key: 'minimum_grade',
            headerName: 'Min Grade',
            flex: 3,
            renderCell: (params) => (
                <PrerequisiteMinGradeCell
                    control={params.control}
                    disabled={params.disabled}
                    minimumGradeOptions={minimumGradeOptions}
                    rowIndex={params.rowIndex}
                />
            )
        }
    ];

    const courseKindCount = (prerequisites ?? []).filter(
        (prereq) => prereq.prerequisite_kind === 'course'
    ).length;

    function handleAddCourseType() {
        appendCourseType({
            course_type_id: '',
            units: 3,
            credit_hours: 3
        });
    }

    function handleRemoveCourseType(index: number) {
        removeCourseType(index);
    }

    function handleAddPrerequisite() {
        appendPrereq({
            course_id: '',
            prerequisite_type: 'Required',
            prerequisite_kind: 'course',
            year_level_required: '',
            minimum_grade: ''
        });
    }

    function handleRemovePrerequisite(index: number) {
        removePrereq(index);
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Stepper Header Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        const isActive = activeStep === step.id;

                        return (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => setActiveStep(step.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isActive
                                        ? 'bg-white text-blue-600'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {step.id}
                                </span>
                                <Icon className="w-4 h-4" />
                                <span>{step.label}</span>
                            </button>
                        );
                    })}
                </div>
                <span className="text-xs text-slate-400 font-medium shrink-0 ml-2">
                    Step {activeStep} of {STEPS.length}
                </span>
            </div>

            {/* Step 1: Overview Data */}
            <div className={activeStep === 1 ? 'flex flex-col gap-4' : 'hidden'}>
                <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <FileTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Overview Data
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enter the basic details, title, code, and department for this course.
                    </p>
                </div>
                <CommonForm
                    containerClassName="gap-4 grid grid-cols-1 md:grid-cols-6"
                    control={control}
                    fields={fields_config}
                    formProps={formProps}
                    hasHelper
                />
            </div>

            {/* Step 2: Course Type */}
            <div className={activeStep === 2 ? 'flex flex-col gap-4' : 'hidden'}>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <BookOpenIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                Course Type Breakdown
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Configure units and credit hours for each type component.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <span>Total Units: <strong>{totalUnits}</strong></span>
                            <span>•</span>
                            <span>Total Credit Hours: <strong>{totalCreditHours}</strong></span>
                        </div>
                    </div>

                    <CommonFormTable<CourseTypeRow, CourseFormValues>
                        columns={courseTypeColumns}
                        contentClassName="min-w-[44rem] lg:min-w-full"
                        control={control}
                        disabled={disabled}
                        emptyDataMessage="No course types added yet. Click Add Row below."
                        fieldArrayName="course_types"
                        rows={courseTypeFields as unknown as (CourseTypeRow & { id: string })[]}
                        tableProps={{
                            containerClassName: 'min-h-[140px]'
                        }}
                        title=""
                        onAddRow={courseTypes.length < courseTypeOptions.length ? handleAddCourseType : undefined}
                        onRemoveRow={handleRemoveCourseType}
                    />
                </div>
            </div>

            {/* Step 3: Prerequisite */}
            <div className={activeStep === 3 ? 'flex flex-col gap-4' : 'hidden'}>
                <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <GitForkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Prerequisites
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Set prerequisite courses, co-requisites, standing requirements, and minimum passing grades.
                    </p>
                </div>
                <CommonFormTable<PrerequisiteRow, CourseFormValues>
                    columns={prerequisiteColumns}
                    contentClassName="min-w-[44rem] lg:min-w-full"
                    control={control}
                    disabled={disabled}
                    emptyDataMessage="No prerequisites added yet"
                    fieldArrayName="prerequisites"
                    rows={prereqFields as unknown as (PrerequisiteRow & { id: string })[]}
                    tableProps={{
                        containerClassName: 'min-h-[160px]'
                    }}
                    title=""
                    onAddRow={courseKindCount < allCourseOptions.length
                        ? handleAddPrerequisite
                        : undefined}
                    onRemoveRow={handleRemovePrerequisite}
                />
            </div>

            {/* Stepper Footer / Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                    {activeStep > 1 && (
                        <CommonButton
                            color="secondary"
                            size="small"
                            startIcon={<ArrowLeftIcon weight="bold" />}
                            variant="outlined"
                            onClick={() => setActiveStep((prev) => prev - 1)}
                        >
                            Back: {STEPS[activeStep - 2].title}
                        </CommonButton>
                    )}
                </div>
                <div>
                    {activeStep < 3 && (
                        <CommonButton
                            color="primary"
                            endIcon={<ArrowRightIcon weight="bold" />}
                            size="small"
                            variant="outlined"
                            onClick={() => setActiveStep((prev) => prev + 1)}
                        >
                            Next: {STEPS[activeStep].title}
                        </CommonButton>
                    )}
                </div>
            </div>
        </div>
    );
}
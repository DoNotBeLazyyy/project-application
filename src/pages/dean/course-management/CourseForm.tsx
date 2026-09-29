import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import CommonFormTable, { CommonFormTableColumn } from '@components/table/CommonFormTable';
import { PREREQUISITE_KIND_OPTIONS, PREREQUISITE_TYPE_OPTIONS, YEAR_LEVEL_STANDING_OPTIONS } from '@constants/course.constant';
import { useCourseTypeOptions } from '@pages/dean/course-management/type/useCourseTypeOptions';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { normalizeMinimumGrade, useMinimumGradeOptions } from '@pages/dean/course-management/useMinimumGradeOptions';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { ComponentPropsForm } from '@type/common.type';
import { CourseTypeOption } from '@type/course/course-type.type';
import { CourseFormValues, PrerequisiteRow } from '@type/course/course.type';
import { useEffect, useRef } from 'react';
import {
    Control, FieldPath, useController, useFieldArray, useWatch
} from 'react-hook-form';

type PrerequisiteField =
    | 'prerequisite_kind'
    | 'course_id'
    | 'prerequisite_type'
    | 'year_level_required'
    | 'minimum_grade';

/**
 * A course type that already covers both halves of a split course, e.g.
 * "Lecture/Laboratory". Matched on text because course types are data the dean
 * maintains, not a fixed enum.
 *
 * @param courseType - One course type option from the database.
 * @returns
 */
function isCombinedCourseType(courseType: CourseTypeOption): boolean {
    const haystack = `${courseType.code} ${courseType.label}`.toLowerCase();

    return haystack.includes('lec') && haystack.includes('lab');
}

function prerequisiteName(index: number, field: PrerequisiteField): FieldPath<CourseFormValues> {
    return `prerequisites.${index}.${field}` as FieldPath<CourseFormValues>;
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

interface CourseFormProps extends ComponentPropsForm {
    control: Control<CourseFormValues>;
    disabled?: boolean;
    excludeCourseId?: string;
    isCodeDisabled?: boolean;
}

export default function CourseForm({
    control,
    disabled,
    excludeCourseId,
    isCodeDisabled,
    ...formProps
}: CourseFormProps) {
    const prerequisites = useWatch({ control, name: 'prerequisites' });
    const { departmentOptions } = useDepartmentOptions();
    const { courseTypeOptions, courseTypes } = useCourseTypeOptions();
    const { minimumGradeOptions } = useMinimumGradeOptions();
    const { courseOptions: allCourseOptions } = useCourseOptions({
        excludeIds: [excludeCourseId].filter((id): id is string => !!id)
    });
    const isSplit = useWatch({ control, name: 'is_split' });
    const courseTypeId = useWatch({ control, name: 'course_type_id' });
    const courseTypeController = useController({ control, name: 'course_type_id' });
    const splitController = useController({ control, name: 'is_split' });
    const combinedCourseType = courseTypes.find(isCombinedCourseType);
    const isCourseTypeLocked = Boolean(isSplit) && Boolean(combinedCourseType);
    const previousSelection = useRef({ courseTypeId: '', isSplit: false });
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'prerequisites'
    });

    /*
     * A split course is saved as one lecture row plus one laboratory row that share
     * a single course type, so these two controls can never disagree. Whichever one
     * the dean touches, the other follows.
     */
    useEffect(function() {
        const previous = previousSelection.current;
        const splitChecked = Boolean(isSplit);

        previousSelection.current = { courseTypeId, isSplit: splitChecked };

        if (disabled || !combinedCourseType) {
            return;
        }

        if (previous.isSplit !== splitChecked) {
            if (splitChecked && courseTypeId !== combinedCourseType.id) {
                courseTypeController.field.onChange(combinedCourseType.id);
            }

            if (!splitChecked && courseTypeId === combinedCourseType.id) {
                courseTypeController.field.onChange('');
            }

            return;
        }

        if (previous.courseTypeId !== courseTypeId) {
            const shouldSplit = courseTypeId === combinedCourseType.id;

            if (shouldSplit !== splitChecked) {
                splitController.field.onChange(shouldSplit);
            }
        }
    }, [combinedCourseType?.id, courseTypeId, disabled, isSplit]);

    const fields_config: FormFieldConfig<CourseFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: 'Full course title' },
            name: 'title',
            rules: disabled
                ? undefined
                : { required: 'Course title is required' },
            type: 'text',
            gridCols: isSplit
                ? 6
                : 2
        },
        {
            disabled: disabled || isCodeDisabled,
            fieldProps: { helperText: 'Unique course code, e.g. CS101' },
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Course code is required' },
            type: 'text',
            gridCols: 2
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
            gridCols: 2
        },
        {
            disabled: disabled || isCourseTypeLocked,
            fieldProps: {
                helperText: isCourseTypeLocked
                    ? `Locked to ${combinedCourseType?.label} while split is on`
                    : 'Type of course, e.g. Lecture or Laboratory'
            },
            name: 'course_type_id',
            options: courseTypeOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a course type' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Lecture units (0-10)' },
            name: 'lecture_units',
            rules: disabled
                ? undefined
                : {
                    required: 'Lecture units is required',
                    min: { value: 0, message: 'Must be at least 0' },
                    max: { value: 10, message: 'Cannot exceed 10' }
                },
            type: 'number',
            gridCols: 2
        },
        ...(isSplit
            ? [{
                disabled,
                fieldProps: { helperText: 'Laboratory units (0-10)' },
                name: 'laboratory_units' as const,
                rules: disabled
                    ? undefined
                    : {
                        required: 'Laboratory units is required',
                        min: { value: 0, message: 'Must be at least 0' },
                        max: { value: 10, message: 'Cannot exceed 10' }
                    },
                type: 'number' as const,
                gridCols: 2
            }]
            : []
        ),
        {
            disabled,
            fieldProps: { helperText: 'Credit hours (0-20, optional)' },
            name: 'credit_hours',
            rules: disabled
                ? undefined
                : {
                    min: { value: 0, message: 'Must be at least 0' },
                    max: { value: 20, message: 'Cannot exceed 20' }
                },
            type: 'number',
            gridCols: 2
        },
        {
            disabled,
            items: [
                { name: 'is_split' as const, label: 'Split into LEC and LAB' },
                { name: 'is_active' as const, label: 'Active' }
            ],
            name: 'is_split',
            type: 'checkbox-group',
            gridCols: 2
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

    function handleAddPrerequisite() {
        append({
            course_id: '',
            prerequisite_type: 'Required',
            prerequisite_kind: 'course',
            year_level_required: '',
            minimum_grade: ''
        });
    }

    function handleRemovePrerequisite(index: number) {
        remove(index);
    }

    return (
        <div className="flex flex-col gap-4">
            <CommonForm
                containerClassName="gap-4 grid grid-cols-1 md:grid-cols-6"
                control={control}
                fields={fields_config}
                formProps={formProps}
                hasHelper
            />
            <CommonFormTable<PrerequisiteRow, CourseFormValues>
                columns={prerequisiteColumns}
                contentClassName="min-w-[44rem] lg:min-w-full"
                control={control}
                disabled={disabled}
                emptyDataMessage="No prerequisites added yet"
                fieldArrayName="prerequisites"
                rows={fields as unknown as (PrerequisiteRow & { id: string })[]}
                tableProps={{
                    containerClassName: 'h-[180px]'
                }}
                title="Prerequisites"
                onAddRow={courseKindCount < allCourseOptions.length
                    ? handleAddPrerequisite
                    : undefined}
                onRemoveRow={handleRemovePrerequisite}
            />
        </div>
    );
}
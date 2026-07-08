import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonSelect from '@components/select/CommonSelect';
import CommonFormTable, { CommonFormTableColumn } from '@components/table/CommonFormTable';
import { PREREQUISITE_KIND_OPTIONS, PREREQUISITE_TYPE_OPTIONS, YEAR_LEVEL_STANDING_OPTIONS } from '@constants/course.constant';
import { useCourseTypeOptions } from '@pages/dean/course-management/type/useCourseTypeOptions';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { useDepartmentOptions } from '@pages/dean/department-management/useDepartmentOptions';
import { ComponentPropsForm } from '@type/common.type';
import { CourseFormValues, PrerequisiteRow } from '@type/course/course.type';
import { Control, useFieldArray, useWatch } from 'react-hook-form';

interface CourseFormProps extends ComponentPropsForm {
    control: Control<CourseFormValues>;
    disabled?: boolean;
    excludeCourseId?: string;
    isCodeDisabled?: boolean;
    isCreate?: boolean;
}

export default function CourseForm({
    control,
    disabled,
    excludeCourseId,
    isCodeDisabled,
    isCreate,
    ...formProps
}: CourseFormProps) {
    const prerequisites = useWatch({ control, name: 'prerequisites' });
    const { departmentOptions } = useDepartmentOptions();
    const { courseTypeOptions } = useCourseTypeOptions();
    const { courseOptions: allCourseOptions } = useCourseOptions({
        excludeIds: [excludeCourseId].filter((id): id is string => !!id)
    });
    const isSplit = useWatch({ control, name: 'is_split' });
    const { fields, append, remove, update } = useFieldArray({
        control,
        name: 'prerequisites'
    });
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
            disabled,
            fieldProps: { helperText: 'Type of course, e.g. Lecture or Laboratory' },
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
            name: 'description',
            type: 'text-area',
            gridCols: 6
        },
        ...(isCreate
            ? [{
                disabled,
                name: 'is_split' as const,
                fieldProps: { label: 'Split into LEC and LAB' },
                type: 'checkbox' as const,
                gridCols: 2
            }]
            : []
        ),
        {
            disabled,
            name: 'is_active',
            fieldProps: { label: 'Active' },
            type: 'checkbox',
            gridCols: 2
        }
    ];
    const prerequisiteColumns: CommonFormTableColumn<PrerequisiteRow>[] = [
        {
            key: 'prerequisite_kind',
            headerName: 'Kind',
            flex: 1,
            renderCell: (row, index, onChange) => (
                <CommonSelect
                    disabled={disabled}
                    fullWidth
                    options={PREREQUISITE_KIND_OPTIONS}
                    size="small"
                    value={row.prerequisite_kind}
                    onChange={(e) => {
                        onChange(index, 'prerequisite_kind', e.target.value);
                        onChange(index, 'course_id', '');
                        onChange(index, 'year_level_required', '');
                        onChange(index, 'minimum_grade', '');
                    }}
                />
            )
        },
        {
            key: 'course_id',
            headerName: 'Course / Year Level',
            flex: 3,
            renderCell: (row, index, onChange) => {
                if (row.prerequisite_kind === 'standing') {
                    return (
                        <CommonSelect
                            disabled={disabled}
                            fullWidth
                            options={YEAR_LEVEL_STANDING_OPTIONS}
                            size="small"
                            value={row.year_level_required}
                            onChange={(e) => onChange(index, 'year_level_required', e.target.value)}
                        />
                    );
                }
                return (
                    <CommonSelect
                        disabled={disabled}
                        fullWidth
                        options={getCourseOptionsForRow(index)}
                        size="small"
                        value={row.course_id}
                        onChange={(e) => onChange(index, 'course_id', e.target.value)}
                    />
                );
            }
        },
        {
            key: 'prerequisite_type',
            headerName: 'Type',
            flex: 2,
            renderCell: (row, index, onChange) => (
                <CommonSelect
                    disabled={disabled}
                    fullWidth
                    options={PREREQUISITE_TYPE_OPTIONS}
                    size="small"
                    value={row.prerequisite_type}
                    onChange={(e) => onChange(index, 'prerequisite_type', e.target.value)}
                />
            )
        },
        {
            key: 'minimum_grade',
            headerName: 'Min Grade',
            flex: 1,
            renderCell: (row, index, onChange) => (
                <CommonSelect
                    disabled={disabled || row.prerequisite_type === 'Co-requisite' || row.prerequisite_kind === 'standing'}
                    fullWidth
                    options={[
                        { label: '—', value: '' },
                        { label: '1.0', value: '1.0' },
                        { label: '1.25', value: '1.25' },
                        { label: '1.5', value: '1.5' },
                        { label: '1.75', value: '1.75' },
                        { label: '2.0', value: '2.0' },
                        { label: '2.25', value: '2.25' },
                        { label: '2.5', value: '2.5' },
                        { label: '2.75', value: '2.75' },
                        { label: '3.0', value: '3.0' }
                    ]}
                    size="small"
                    value={row.prerequisite_type === 'Co-requisite' || row.prerequisite_kind === 'standing'
                        ? ''
                        : row.minimum_grade
                    }
                    onChange={(e) => onChange(index, 'minimum_grade', e.target.value)}
                />
            )
        }
    ];
    const courseKindCount = fields.filter((field) =>
        (field as unknown as PrerequisiteRow).prerequisite_kind === 'course').length;

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

    function handlePrerequisiteChange(
        index: number,
        field: keyof PrerequisiteRow,
        value: unknown
    ) {
        const current = fields[index];
        update(index, { ...current, [field]: value });
    }

    function getCourseOptionsForRow(rowIndex: number) {
        const selectedInOtherRows = prerequisites
            .filter((prereq, i) => i !== rowIndex && prereq.prerequisite_kind === 'course')
            .map((prereq) => prereq.course_id)
            .filter(Boolean);

        return allCourseOptions.filter(
            (option) => !selectedInOtherRows.includes(String(option.value))
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <CommonForm
                containerClassName="gap-4 grid grid-cols-6"
                control={control}
                fields={fields_config}
                formProps={formProps}
                hasHelper
            />
            {<CommonFormTable<PrerequisiteRow>
                columns={prerequisiteColumns}
                disabled={disabled}
                emptyDataMessage="No prerequisites added yet"
                rows={fields as unknown as PrerequisiteRow[]}
                tableProps={{
                    containerClassName: 'h-[180px]'
                }}
                title="Prerequisites"
                onAddRow={courseKindCount < allCourseOptions.length
                    ? handleAddPrerequisite
                    : undefined}
                onChange={handlePrerequisiteChange}
                onRemoveRow={handleRemovePrerequisite}
            />}
        </div>
    );
}
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { YEAR_LEVEL_OPTIONS } from '@constants/year-level.constant';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { TermTypeOptionWithMeta, useActiveTermOptions } from '@pages/dean/curriculum-map-management/useActiveTermOptions';
import { ComponentPropsForm } from '@type/common.type';
import { CurriculumMapEntry, CurriculumMapFormValues } from '@type/curriculum-map.type';
import { useEffect, useMemo } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

interface CurriculumMapFormProps extends ComponentPropsForm {
    control: Control<CurriculumMapFormValues>;
    disabled?: boolean;
    selectedSchoolYearId?: string;
    departmentId?: string;
    existingEntries?: CurriculumMapEntry[];
    currentEntryId?: string | null;
    setValue?: UseFormSetValue<CurriculumMapFormValues>;
    availableTermOptions?: TermTypeOptionWithMeta[];
}

export default function CurriculumMapForm({
    control,
    disabled,
    selectedSchoolYearId,
    departmentId,
    existingEntries,
    currentEntryId,
    setValue,
    availableTermOptions,
    ...formProps
}: CurriculumMapFormProps) {
    const { termOptions: hookTermOptions, allTermTypes } = useActiveTermOptions(selectedSchoolYearId);
    const { courseOptions, courses } = useCourseOptions({ departmentId });

    const effectiveTermOptions = availableTermOptions && availableTermOptions.length > 0
        ? availableTermOptions
        : hookTermOptions;

    const selectedCourseId = useWatch({ control, name: 'course_id' });
    const selectedCourse = courses.find((c) => c.id === selectedCourseId);
    const selectedTermTypeId = useWatch({ control, name: 'term_type_id' });

    const displayedTermTypeOptions = useMemo(() => {
        if (!selectedTermTypeId) return effectiveTermOptions;
        const exists = effectiveTermOptions.some((opt) => String(opt.value) === String(selectedTermTypeId));
        if (exists) return effectiveTermOptions;
        const fallback = allTermTypes.find((opt) => String(opt.value) === String(selectedTermTypeId));
        return [
            ...effectiveTermOptions,
            {
                label: fallback?.label || 'Selected Term',
                value: selectedTermTypeId,
                code: fallback?.code
            }
        ];
    }, [effectiveTermOptions, selectedTermTypeId, allTermTypes]);

    const isCustomType = selectedCourse?.course_type_code
        && !['LECTURE', 'LEC', 'LABORATORY', 'LAB'].includes(selectedCourse.course_type_code.toUpperCase()
            .trim());

    const customTypeLabel = selectedCourse?.course_type_label || selectedCourse?.course_type_code || 'Course Type';

    const displayedCourseOptions = useMemo(() => {
        if (selectedCourseId && !courseOptions.some((opt) => opt.value === selectedCourseId)) {
            return [
                ...courseOptions,
                {
                    label: selectedCourse?.label || 'Selected Course',
                    value: selectedCourseId
                }
            ];
        }
        return courseOptions;
    }, [courseOptions, selectedCourseId, selectedCourse]);

    const activeEntries = useMemo(() => {
        if (!existingEntries) return [];
        return existingEntries.filter((e) => !currentEntryId || e.id !== currentEntryId);
    }, [existingEntries, currentEntryId]);

    const forbiddenCourseIds = useMemo(() => {
        const forbidden = new Set<string>();
        for (const entry of activeEntries) {
            if (entry.course_id) {
                forbidden.add(entry.course_id);
            }
        }
        return forbidden;
    }, [activeEntries]);

    const filteredCourseOptions = useMemo(() => {
        if (forbiddenCourseIds.size === 0) return displayedCourseOptions;
        return displayedCourseOptions.filter((opt) => !forbiddenCourseIds.has(String(opt.value)));
    }, [displayedCourseOptions, forbiddenCourseIds]);

    // Auto-clear course if it is already in the curriculum map
    useEffect(() => {
        if (selectedCourseId && forbiddenCourseIds.has(selectedCourseId)) {
            setValue?.('course_id', '', { shouldValidate: true, shouldDirty: true });
        }
    }, [selectedCourseId, forbiddenCourseIds, setValue]);

    // Auto-populate default units when a course is selected during creation
    useEffect(() => {
        if (!selectedCourseId || !selectedCourse || !setValue || currentEntryId) return;
        setValue('lecture_units', String(selectedCourse.lecture_units ?? 0), { shouldDirty: true });
        setValue('laboratory_units', String(selectedCourse.laboratory_units ?? 0), { shouldDirty: true });
        if (selectedCourse.total_units !== undefined) {
            setValue('units', String(selectedCourse.total_units), { shouldDirty: true });
        }
    }, [selectedCourseId, selectedCourse, setValue, currentEntryId]);

    const baseCourseHelperText = !departmentId
        ? 'Please select a program or department first'
        : courseOptions.length === 0
            ? 'No courses available for this department'
            : 'Select the course to add to this curriculum';

    const courseHelperText = forbiddenCourseIds.size > 0
        ? `${baseCourseHelperText} (${forbiddenCourseIds.size} course${forbiddenCourseIds.size > 1
            ? 's'
            : ''} filtered: already in curriculum map)`
        : baseCourseHelperText;

    const fields: FormFieldConfig<CurriculumMapFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: courseHelperText },
            label: 'Course',
            name: 'course_id',
            options: filteredCourseOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a course' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: 'Year level when this course is taken' },
            label: 'Year Level',
            name: 'year_level',
            options: YEAR_LEVEL_OPTIONS,
            rules: disabled
                ? undefined
                : { required: 'Please select a year level' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: 'Term when this course is offered' },
            label: 'Term Type',
            name: 'term_type_id',
            options: displayedTermTypeOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a term' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: 'Lecture units for this program (override default if needed)' },
            label: 'Lecture Units',
            name: 'lecture_units',
            type: 'number'
        },
        {
            disabled,
            fieldProps: { helperText: 'Laboratory units for this program (override default if needed)' },
            label: 'Laboratory Units',
            name: 'laboratory_units',
            type: 'number'
        },
        ...(isCustomType
            ? [
                {
                    disabled,
                    fieldProps: { helperText: `${customTypeLabel} units for this program (override default if needed)` },
                    label: `${customTypeLabel} Units`,
                    name: 'units' as const,
                    type: 'number' as const
                }
            ]
            : []),
        {
            disabled,
            fieldProps: { helperText: 'Display order within the term (starts at 1)' },
            label: 'Sequence',
            name: 'sequence',
            rules: disabled
                ? undefined
                : {
                    required: 'Sequence is required',
                    min: { value: 1, message: 'Must be at least 1' }
                },
            type: 'number'
        },
        {
            disabled,
            name: 'is_elective',
            fieldProps: { label: 'Elective' },
            type: 'checkbox'
        }
    ];

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}
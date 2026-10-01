import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { YEAR_LEVEL_OPTIONS } from '@constants/year-level.constant';
import { useTermTypeOptions } from '@pages/admin/term-management/type/useTermTypeOptions';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { getAcademicYearCalendarDetails } from '@services/school-year.service';
import { listTerms } from '@services/term/term.service';
import { ComponentPropsForm } from '@type/common.type';
import { CurriculumMapFormValues } from '@type/curriculum-map.type';
import { useEffect, useState } from 'react';
import { Control } from 'react-hook-form';

interface CurriculumMapFormProps extends ComponentPropsForm {
    control: Control<CurriculumMapFormValues>;
    disabled?: boolean;
    selectedSchoolYearId?: string;
}

export default function CurriculumMapForm({
    control,
    disabled,
    selectedSchoolYearId,
    ...formProps
}: CurriculumMapFormProps) {
    const { termTypeOptions: allTermTypeOptions } = useTermTypeOptions();
    const { courseOptions } = useCourseOptions({});
    const [termTypeOptions, setTermTypeOptions] = useState<CommonSelectOption[]>([]);

    useEffect(() => {
        async function fetchAvailableTermTypes() {
            if (!selectedSchoolYearId) {
                setTermTypeOptions(allTermTypeOptions);
                return;
            }

            const [calendarRes, listRes] = await Promise.all([
                getAcademicYearCalendarDetails(selectedSchoolYearId),
                listTerms(1, 100, '', [], { school_year_id: selectedSchoolYearId, status: 'All' })
            ]);

            const availableIds = new Set<string>();

            if (calendarRes.data?.terms) {
                for (const t of calendarRes.data.terms) {
                    if (t.term_type_id) {
                        availableIds.add(t.term_type_id);
                    }
                }
            }

            if (listRes.data?.items) {
                for (const t of listRes.data.items) {
                    if (t.term_type_id) {
                        availableIds.add(t.term_type_id);
                    }
                }
            }

            if (availableIds.size > 0) {
                const filtered = allTermTypeOptions.filter((opt) => availableIds.has(String(opt.value)));
                if (filtered.length > 0) {
                    setTermTypeOptions(filtered);
                } else {
                    const fallback = Array.from(availableIds).map((id) => ({
                        label: id,
                        value: id
                    }));
                    setTermTypeOptions(fallback);
                }
            } else {
                setTermTypeOptions(allTermTypeOptions);
            }
        }

        fetchAvailableTermTypes();
    }, [selectedSchoolYearId, allTermTypeOptions]);

    const fields: FormFieldConfig<CurriculumMapFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: 'Select the course to add to this curriculum' },
            name: 'course_id',
            options: courseOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a course' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: 'Year level when this course is taken' },
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
            name: 'term_type_id',
            options: termTypeOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a term' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: 'Display order within the term (starts at 1)' },
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
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { getFacultyOptions, getTerms } from '@services/section.service';
import SectionGradingOverride from '@pages/dean/section-management/SectionGradingOverride';
import { ComponentPropsForm } from '@type/common.type';
import { SectionFormValues, SectionStatus } from '@type/section.type';
import { useEffect, useState } from 'react';
import { Control } from 'react-hook-form';

const STATUS_OPTIONS: { label: string; value: SectionStatus }[] = [
    { label: 'Open', value: 'Open' },
    { label: 'Full', value: 'Full' },
    { label: 'Ongoing', value: 'Ongoing' },
    { label: 'Closed', value: 'Closed' },
    { label: 'Cancelled', value: 'Cancelled' }
];

interface SectionFormProps extends ComponentPropsForm {
    control: Control<SectionFormValues>;
    currentSectionId?: string;
    disabled?: boolean;
    isCreate?: boolean;
}

export default function SectionForm({
    control,
    currentSectionId,
    disabled,
    isCreate,
    ...formProps
}: SectionFormProps) {
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);
    const [facultyOptions, setFacultyOptions] = useState<CommonSelectOption[]>([]);
    const { courseOptions } = useCourseOptions({});

    useEffect(function() {
        async function fetchOptions() {
            const [termsResult, facultyResult] = await Promise.all([
                getTerms(),
                getFacultyOptions()
            ]);

            if (termsResult.data) {
                const availableTerms = isCreate
                    ? termsResult.data.filter((term) => term.is_active_academic_year !== false)
                    : termsResult.data;

                setTermOptions(
                    availableTerms.map((term) => ({
                        label: term.label,
                        value: term.id
                    }))
                );
            }

            if (facultyResult.data) {
                setFacultyOptions(
                    facultyResult.data.map((faculty) => ({
                        label: faculty.full_name,
                        value: faculty.id
                    }))
                );
            }
        }

        fetchOptions();
    }, [isCreate]);

    const fields: FormFieldConfig<SectionFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: 'Section identifier, e.g. BSCS-1A' },
            name: 'section_code',
            rules: disabled
                ? undefined
                : { required: 'Section code is required' },
            type: 'text',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Term this section runs in' },
            name: 'term_id',
            options: termOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a term' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Course being offered in this section' },
            name: 'course_id',
            options: courseOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a course' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Assigned instructor (optional)' },
            name: 'faculty_id',
            options: facultyOptions,
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Room or venue (optional)' },
            name: 'room',
            type: 'text',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Maximum number of enrollees (1-999)' },
            name: 'max_slots',
            rules: disabled
                ? undefined
                : {
                    required: 'Maximum slots is required',
                    min: { value: 1, message: 'Must be at least 1' },
                    max: { value: 999, message: 'Cannot exceed 999' }
                },
            type: 'number',
            gridCols: 2
        },
        ...(!isCreate
            ? [{
                disabled,
                fieldProps: { helperText: 'Current status of this section' },
                name: 'status' as const,
                options: STATUS_OPTIONS,
                rules: disabled
                    ? undefined
                    : { required: 'Please select a status' },
                type: 'select' as const,
                gridCols: 2
            }]
            : [])
    ];

    return (
        <div className="flex flex-col gap-4">
            <CommonForm
                containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                control={control}
                fields={fields}
                formProps={formProps}
                hasHelper
            />
            <SectionGradingOverride
                control={control}
                currentSectionId={currentSectionId}
                disabled={disabled}
            />
        </div>
    );
}
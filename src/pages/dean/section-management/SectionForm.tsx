import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { getFacultyOptions, getTerms } from '@services/section.service';
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
    disabled?: boolean;
    isCreate?: boolean;
}

export default function SectionForm({
    control,
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
                setTermOptions(
                    termsResult.data.map((term) => ({
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
    }, []);

    const fields: FormFieldConfig<SectionFormValues>[] = [
        {
            disabled,
            name: 'section_code',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'text',
            gridCols: 2
        },
        {
            disabled,
            name: 'term_id',
            options: termOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            name: 'course_id',
            options: courseOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            name: 'faculty_id',
            options: facultyOptions,
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            name: 'room',
            type: 'text',
            gridCols: 2
        },
        {
            disabled,
            name: 'max_slots',
            rules: disabled
                ? undefined
                : {
                    required: 'Required',
                    min: { value: 1, message: 'Must be at least 1' },
                    max: { value: 999, message: 'Cannot exceed 999' }
                },
            type: 'number',
            gridCols: 2
        },
        ...(!isCreate
            ? [{
                disabled,
                name: 'status' as const,
                options: STATUS_OPTIONS,
                rules: disabled
                    ? undefined
                    : { required: 'Required' },
                type: 'select' as const,
                gridCols: 2
            }]
            : [])
    ];

    return (
        <CommonForm
            containerClassName="gap-4 grid grid-cols-2"
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}
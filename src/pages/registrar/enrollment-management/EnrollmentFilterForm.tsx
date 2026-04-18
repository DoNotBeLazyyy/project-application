import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { useSectionOptions } from '@pages/dean/section-management/useSectionOptions';
import { getTerms } from '@services/section.service';
import { ComponentPropsForm } from '@type/common.type';
import { EnrollmentFilterValues, EnrollmentStatus } from '@type/enrollment.type';
import { useEffect, useState } from 'react';
import { Control } from 'react-hook-form';

const STATUS_OPTIONS: { label: string; value: EnrollmentStatus }[] = [
    { label: 'Enrolled', value: 'Enrolled' },
    { label: 'Dropped', value: 'Dropped' },
    { label: 'Withdrawn', value: 'Withdrawn' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Failed', value: 'Failed' },
    { label: 'Incomplete', value: 'Incomplete' }
];

interface EnrollmentFilterFormProps extends ComponentPropsForm {
    control: Control<EnrollmentFilterValues>;
}

export default function EnrollmentFilterForm({
    control,
    ...formProps
}: EnrollmentFilterFormProps) {
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);
    const { sectionOptions } = useSectionOptions();

    useEffect(function() {
        async function fetchTerms() {
            const result = await getTerms();

            if (result.data) {
                setTermOptions(
                    result.data.map((term) => ({
                        label: term.label,
                        value: term.id
                    }))
                );
            }
        }

        fetchTerms();
    }, []);

    const fields: FormFieldConfig<EnrollmentFilterValues>[] = [
        {
            name: 'term_ids',
            options: termOptions,
            type: 'multi-select'
        },
        {
            name: 'section_ids',
            options: sectionOptions,
            type: 'multi-select'
        },
        {
            name: 'statuses',
            options: STATUS_OPTIONS,
            type: 'multi-select'
        }
    ];

    return (
        <CommonForm
            containerClassName="flex flex-col gap-4"
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}
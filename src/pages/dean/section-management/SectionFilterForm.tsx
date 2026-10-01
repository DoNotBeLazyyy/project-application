import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { getTerms } from '@services/section.service';
import { ComponentPropsForm } from '@type/common.type';
import { SectionFilterValues, SectionStatus } from '@type/section.type';
import { useEffect, useState } from 'react';
import { Control } from 'react-hook-form';

const STATUS_OPTIONS: { label: string; value: SectionStatus }[] = [
    { label: 'Open', value: 'Open' },
    { label: 'Full', value: 'Full' },
    { label: 'Ongoing', value: 'Ongoing' },
    { label: 'Closed', value: 'Closed' },
    { label: 'Cancelled', value: 'Cancelled' }
];

interface SectionFilterFormProps extends ComponentPropsForm {
    control: Control<SectionFilterValues>;
}

export default function SectionFilterForm({
    control,
    ...formProps
}: SectionFilterFormProps) {
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);
    const { programOptions } = useProgramOptions();

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

    const fields: FormFieldConfig<SectionFilterValues>[] = [
        {
            name: 'term_ids',
            options: termOptions,
            type: 'multi-select'
        },
        {
            name: 'program_ids',
            options: programOptions,
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
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useTermOptions } from '@hooks/use-term-options';
import { useProgramOptions } from '@pages/dean/program-management/use-program-options';
import { ComponentPropsForm } from '@type/common.type';
import { SectionFilterValues, SectionStatus } from '@type/section.type';
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
    const { termOptions } = useTermOptions();
    const { programOptions } = useProgramOptions();

    const fields: FormFieldConfig<SectionFilterValues>[] = [
        {
            label: 'Term',
            name: 'term_ids',
            options: termOptions,
            type: 'multi-select'
        },
        {
            label: 'Program',
            name: 'program_ids',
            options: programOptions,
            type: 'multi-select'
        },
        {
            label: 'Status',
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
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useTermOptions } from '@pages/dean/faculty-load/hooks/useTermOptions';
import { ComponentPropsForm } from '@type/common.type';
import { ScheduleConflictFilterValues, ScheduleConflictType } from '@type/faculty-load.type';
import { Control } from 'react-hook-form';

const CONFLICT_TYPE_OPTIONS: { label: string; value: ScheduleConflictType }[] = [
    { label: 'Faculty double-booking', value: 'Faculty' },
    { label: 'Room double-booking', value: 'Room' }
];

interface ScheduleConflictFilterFormProps extends ComponentPropsForm {
    control: Control<ScheduleConflictFilterValues>;
}

export default function ScheduleConflictFilterForm({
    control,
    ...formProps
}: ScheduleConflictFilterFormProps) {
    const { termOptions } = useTermOptions();

    const fields: FormFieldConfig<ScheduleConflictFilterValues>[] = [
        {
            label: 'Term',
            name: 'term_id',
            options: termOptions,
            type: 'select'
        },
        {
            label: 'Conflict Type',
            name: 'conflict_types',
            options: CONFLICT_TYPE_OPTIONS,
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
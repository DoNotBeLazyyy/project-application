import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { EventFilterValues } from '@type/event.type';
import { Control } from 'react-hook-form';

interface EventFilterFormProps extends ComponentPropsForm {
    control: Control<EventFilterValues>;
}

const FIELDS: FormFieldConfig<EventFilterValues>[] = [
    {
        label: 'Audience',
        name: 'audience',
        options: [
            { label: 'All', value: 'All' },
            { label: 'Everyone (Global)', value: 'Global' },
            { label: 'All Faculty', value: 'Faculty' },
            { label: 'All Students', value: 'Student' },
            { label: 'Specific Sections', value: 'Section' }
        ],
        type: 'select'
    },
    {
        label: 'Timeframe',
        name: 'upcoming_only',
        options: [
            { label: 'All events', value: 'All' },
            { label: 'Upcoming only', value: 'true' }
        ],
        type: 'select'
    }
];

export default function EventFilterForm({
    control,
    ...formProps
}: EventFilterFormProps) {
    return (
        <CommonForm
            control={control}
            fields={FIELDS}
            formProps={formProps}
        />
    );
}
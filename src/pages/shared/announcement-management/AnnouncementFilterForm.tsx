import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { AnnouncementFilterValues } from '@type/announcement.type';
import { ComponentPropsForm } from '@type/common.type';
import { Control } from 'react-hook-form';

interface AnnouncementFilterFormProps extends ComponentPropsForm {
    control: Control<AnnouncementFilterValues>;
}

const FIELDS: FormFieldConfig<AnnouncementFilterValues>[] = [
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
        label: 'Pinned',
        name: 'is_pinned',
        options: [
            { label: 'All', value: 'All' },
            { label: 'Pinned only', value: 'true' },
            { label: 'Not pinned', value: 'false' }
        ],
        type: 'select'
    }
];

export default function AnnouncementFilterForm({
    control,
    ...formProps
}: AnnouncementFilterFormProps) {
    return (
        <CommonForm
            control={control}
            fields={FIELDS}
            formProps={formProps}
        />
    );
}
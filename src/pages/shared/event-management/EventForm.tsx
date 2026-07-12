import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { getAnnouncementSectionOptions } from '@services/announcement.service';
import { useAppStore } from '@stores/app.store';
import { AnnouncementAudience } from '@type/announcement.type';
import { ComponentPropsForm } from '@type/common.type';
import { EventFormValues } from '@type/event.type';
import { useEffect, useState } from 'react';
import { Control, useWatch } from 'react-hook-form';

interface EventFormProps extends ComponentPropsForm {
    control: Control<EventFormValues>;
    disabled?: boolean;
}

const STAFF_AUDIENCE_OPTIONS: CommonSelectOption[] = [
    { label: 'Everyone (Global)', value: 'Global' },
    { label: 'All Faculty', value: 'Faculty' },
    { label: 'All Students', value: 'Student' },
    { label: 'Specific Sections', value: 'Section' }
];

const FACULTY_AUDIENCE_OPTIONS: CommonSelectOption[] = [
    { label: 'Specific Sections', value: 'Section' }
];

export default function EventForm({
    control,
    disabled,
    ...formProps
}: EventFormProps) {
    const activeRole = useAppStore((s) => s.activeRole);
    const isFacultyOnly = activeRole === 'Faculty';
    const [sectionOptions, setSectionOptions] = useState<CommonSelectOption[]>([]);

    const audience = useWatch({
        control,
        name: 'target_audience'
    }) as AnnouncementAudience | undefined;

    useEffect(function() {
        let active = true;

        async function loadSections() {
            const result = await getAnnouncementSectionOptions();

            if (active && result.data) {
                setSectionOptions(result.data.map((s) => ({
                    label: s.label,
                    value: s.id
                })));
            }
        }

        loadSections();

        return function() {
            active = false;
        };
    }, []);

    const fields: FormFieldConfig<EventFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: 'Name of the event' },
            label: 'Title',
            name: 'title',
            rules: disabled
                ? undefined
                : { required: 'Title is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Who should see this event' },
            label: 'Audience',
            name: 'target_audience',
            options: isFacultyOnly
                ? FACULTY_AUDIENCE_OPTIONS
                : STAFF_AUDIENCE_OPTIONS,
            rules: disabled
                ? undefined
                : { required: 'Audience is required' },
            type: 'select'
        }
    ];

    if (audience === 'Section') {
        fields.push({
            disabled,
            fieldProps: { helperText: 'Show this event to one or more sections' },
            label: 'Sections',
            name: 'section_ids',
            options: sectionOptions,
            rules: disabled
                ? undefined
                : { required: 'Select at least one section' },
            type: 'multi-select'
        });
    }

    fields.push(
        {
            disabled,
            fieldProps: { helperText: 'When the event starts' },
            label: 'Start Date',
            name: 'start_at',
            rules: disabled
                ? undefined
                : { required: 'Start date is required' },
            type: 'date'
        },
        {
            disabled,
            fieldProps: { helperText: 'When the event ends (optional)' },
            label: 'End Date',
            name: 'end_at',
            type: 'date'
        },
        {
            disabled,
            fieldProps: { helperText: 'Where the event takes place (optional)' },
            label: 'Location',
            name: 'location',
            type: 'text'
        },
        {
            disabled,
            label: 'Description',
            name: 'description',
            placeholder: 'Add event details...',
            type: 'text-area'
        }
    );

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { ALL_SECTIONS_OPTION, ALL_SECTIONS_VALUE } from '@constants/event.constant';
import { getAnnouncementSectionOptions } from '@services/announcement.service';
import { useAppStore } from '@stores/app.store';
import { ComponentPropsForm } from '@type/common.type';
import { EventFormValues } from '@type/event.type';
import { useEffect, useState } from 'react';
import { Control } from 'react-hook-form';

interface EventFormProps extends ComponentPropsForm {
    control: Control<EventFormValues>;
    disabled?: boolean;
}

function validateSections(value: string | string[]): string | true {
    return Array.isArray(value) && value.length > 0
        ? true
        : 'Select at least one section';
}

export default function EventForm({
    control,
    disabled,
    ...formProps
}: EventFormProps) {
    const activeRole = useAppStore((s) => s.activeRole);
    const isFacultyOnly = activeRole === 'Faculty';
    const [sectionOptions, setSectionOptions] = useState<CommonSelectOption[]>([]);

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

    const audienceOptions = isFacultyOnly
        ? sectionOptions
        : [ALL_SECTIONS_OPTION, ...sectionOptions];

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
            fieldProps: {
                exclusiveValue: isFacultyOnly
                    ? undefined
                    : ALL_SECTIONS_VALUE,
                helperText: isFacultyOnly
                    ? 'Show this event to one or more sections'
                    : 'Pick "All (Everyone)" or one or more specific sections',
                placeholder: 'Select sections'
            },
            label: 'Sections',
            name: 'section_ids',
            options: audienceOptions,
            rules: disabled
                ? undefined
                : { validate: validateSections },
            type: 'multi-select'
        },
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
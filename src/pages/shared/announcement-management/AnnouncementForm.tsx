import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { getAnnouncementSectionOptions } from '@services/announcement.service';
import { useAppStore } from '@stores/app.store';
import { AnnouncementAudience, AnnouncementFormValues } from '@type/announcement.type';
import { ComponentPropsForm } from '@type/common.type';
import { useEffect, useState } from 'react';
import { Control, useWatch } from 'react-hook-form';

interface AnnouncementFormProps extends ComponentPropsForm {
    control: Control<AnnouncementFormValues>;
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

export default function AnnouncementForm({
    control,
    disabled,
    ...formProps
}: AnnouncementFormProps) {
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

    const fields: FormFieldConfig<AnnouncementFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: 'A short, descriptive headline' },
            label: 'Title',
            name: 'title',
            rules: disabled
                ? undefined
                : { required: 'Title is required' },
            type: 'text'
        },
        {
            disabled,
            label: 'Content',
            name: 'content',
            placeholder: 'Write the announcement details here...',
            rules: disabled
                ? undefined
                : { required: 'Content is required' },
            type: 'text-area'
        },
        {
            disabled,
            fieldProps: { helperText: 'Who should receive this announcement' },
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
            fieldProps: { helperText: 'Post to one or more sections at once' },
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
            fieldProps: { helperText: 'Leave empty to keep it visible indefinitely' },
            label: 'Expires On',
            name: 'expires_at',
            type: 'date'
        },
        {
            disabled,
            fieldProps: { label: 'Pin to the top of the feed' },
            label: 'Pinned',
            name: 'is_pinned',
            type: 'checkbox'
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
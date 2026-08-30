import FileAttachmentUploader from '@components/attachment/FileAttachmentUploader';
import ValidCommonToastEditor from '@components/editor/ValidCommonToastEditor';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { getAnnouncementSectionOptions } from '@services/announcement.service';
import { useAppStore } from '@stores/app.store';
import { AnnouncementAudience, AnnouncementFormValues } from '@type/announcement.type';
import { ComponentPropsForm } from '@type/common.type';
import { useEffect, useState } from 'react';
import { Control, useController, useWatch } from 'react-hook-form';

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
    const authorName = useWatch({
        control,
        name: 'author_name'
    });
    const postedOn = useWatch({
        control,
        name: 'posted_on'
    });

    const {
        field: { value: attachments = [], onChange: setAttachments }
    } = useController({
        control,
        name: 'attachments'
    });

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
        ...(authorName || postedOn
            ? [
                {
                    disabled: true,
                    fieldProps: { helperText: 'Author of the announcement' },
                    label: 'Posted by',
                    name: 'author_name' as const,
                    type: 'text' as const
                },
                {
                    disabled: true,
                    fieldProps: { helperText: 'Publication timestamp' },
                    label: 'Posted on',
                    name: 'posted_on' as const,
                    type: 'text' as const
                }
            ]
            : []),
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
        },
        ...(audience === 'Section'
            ? [
                {
                    disabled,
                    fieldProps: { helperText: 'Post to one or more sections at once' },
                    gridCols: 2,
                    label: 'Sections',
                    name: 'section_ids' as const,
                    options: sectionOptions,
                    rules: disabled
                        ? undefined
                        : { required: 'Select at least one section' },
                    type: 'multi-select' as const
                }
            ]
            : []),
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
    ];

    return (
        <form {...formProps} className="flex flex-col gap-5 w-full">
            <CommonForm
                containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                control={control}
                fields={fields}
                hasHelper
            />

            <ValidCommonToastEditor
                control={control}
                disabled={disabled}
                height="320px"
                helperText="Use the rich text toolbar to style headings, lists, bold/italic text, tables, and links."
                isRequired={!disabled}
                label="Content"
                name="content"
                placeholder="Write the announcement details here..."
                rules={disabled
                    ? undefined
                    : { required: 'Content is required' }}
            />

            <FileAttachmentUploader
                attachments={attachments ?? []}
                disabled={disabled}
                folderPrefix="announcements"
                onChange={setAttachments}
            />
        </form>
    );
}
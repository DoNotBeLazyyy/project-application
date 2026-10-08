import FileAttachmentUploader from '@components/attachment/FileAttachmentUploader';
import ValidCommonToastEditor from '@components/editor/ValidCommonToastEditor';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { getAnnouncementSectionOptions } from '@services/announcement.service';
import { useAppStore } from '@stores/app.store';
import { AnnouncementAudience, CommunicationFormValues, CommunicationItemType } from '@type/announcement.type';
import { ComponentPropsForm } from '@type/common.type';
import { getRoleFromPath } from '@utils/role-path.util';
import { useEffect, useRef, useState } from 'react';
import { Control, useController, useWatch } from 'react-hook-form';

export interface AnnouncementFormProps extends ComponentPropsForm {
    control: Control<CommunicationFormValues>;
    disabled?: boolean;
}

export const ITEM_TYPE_OPTIONS: CommonSelectOption[] = [
    { label: 'Announcement', value: 'Announcement' },
    { label: 'Event', value: 'Event' }
];

const STAFF_AUDIENCE_OPTIONS: CommonSelectOption[] = [
    { label: 'Everyone (Global)', value: 'Global' },
    { label: 'All Faculty', value: 'Faculty' },
    { label: 'All Students', value: 'Student' },
    { label: 'Specific Sections', value: 'Section' }
];

const FACULTY_AUDIENCE_OPTIONS: CommonSelectOption[] = [
    { label: 'Specific Sections', value: 'Section' }
];

function validateSections(value: unknown): string | true {
    return Array.isArray(value) && value.length > 0
        ? true
        : 'Select at least one section';
}

export default function AnnouncementForm({
    control,
    disabled,
    ...formProps
}: AnnouncementFormProps) {
    const activeRole = useAppStore((s) => s.activeRole);
    const isFacultyOnly = activeRole === 'Faculty' || (typeof window !== 'undefined' && getRoleFromPath(window.location.pathname) === 'Faculty');
    const [sectionOptions, setSectionOptions] = useState<CommonSelectOption[]>([]);
    const hasAutoSelectedRef = useRef(false);

    const itemType = (useWatch({
        control,
        name: 'item_type'
    }) as CommunicationItemType) || 'Announcement';

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
        field: { value: audienceValue, onChange: setTargetAudience }
    } = useController({
        control,
        name: 'target_audience'
    });

    const {
        field: { value: sectionIds = [], onChange: setSectionIds }
    } = useController({
        control,
        name: 'section_ids'
    });

    const {
        field: { value: attachments = [], onChange: setAttachments }
    } = useController({
        control,
        name: 'attachments'
    });

    const {
        field: { value: contentValue = '', onChange: setContent }
    } = useController({
        control,
        name: 'content'
    });

    const {
        field: { value: descriptionValue = '', onChange: setDescription }
    } = useController({
        control,
        name: 'description'
    });

    useEffect(function() {
        if (isFacultyOnly && audienceValue !== 'Section') {
            setTargetAudience('Section');
        }
    }, [isFacultyOnly, audienceValue, setTargetAudience]);

    useEffect(function() {
        let active = true;

        async function loadSections() {
            const result = await getAnnouncementSectionOptions();

            if (active && result.data) {
                const options = result.data.map((s) => ({
                    label: s.label,
                    value: s.id
                }));
                setSectionOptions(options);

                if (isFacultyOnly && !hasAutoSelectedRef.current && (!sectionIds || sectionIds.length === 0) && options.length > 0) {
                    hasAutoSelectedRef.current = true;
                    setSectionIds([options[0].value]);
                }
            }
        }

        loadSections();

        return function() {
            active = false;
        };
    }, [isFacultyOnly]);

    const fields: FormFieldConfig<CommunicationFormValues>[] = [
        ...(authorName || postedOn
            ? [
                {
                    disabled: true,
                    fieldProps: { helperText: 'Author of this post' },
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
            fieldProps: { helperText: 'Select whether this post is an Announcement or a scheduled Event' },
            label: 'Type',
            name: 'item_type',
            options: ITEM_TYPE_OPTIONS,
            rules: disabled
                ? undefined
                : { required: 'Type is required' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: {
                helperText: itemType === 'Event'
                    ? 'Name of the event'
                    : 'A short, descriptive headline'
            },
            label: itemType === 'Event' ? 'Event Title' : 'Title',
            name: 'title',
            rules: disabled
                ? undefined
                : { required: 'Title is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: {
                helperText: itemType === 'Event'
                    ? 'Who should be able to view and attend this event'
                    : 'Who should receive this announcement'
            },
            label: 'Audience',
            name: 'target_audience' as const,
            options: isFacultyOnly
                ? FACULTY_AUDIENCE_OPTIONS
                : STAFF_AUDIENCE_OPTIONS,
            rules: disabled
                ? undefined
                : { required: 'Audience is required' },
            type: 'select' as const
        },
        ...(audience === 'Section' || isFacultyOnly
            ? [
                {
                    disabled,
                    fieldProps: {
                        helperText: 'Select one or more sections',
                        placeholder: 'Select sections'
                    },
                    gridCols: 2,
                    label: 'Sections',
                    name: 'section_ids' as const,
                    options: sectionOptions,
                    rules: disabled
                        ? undefined
                        : { validate: validateSections },
                    type: 'multi-select' as const
                }
            ]
            : []),

        // --- SPECIFIC FIELDS FOR ANNOUNCEMENTS ---
        ...(itemType === 'Announcement'
            ? [
                {
                    disabled,
                    fieldProps: { helperText: 'Leave empty to keep it visible indefinitely' },
                    label: 'Expires On',
                    name: 'expires_at' as const,
                    type: 'date' as const
                },
                {
                    disabled,
                    fieldProps: { label: 'Pin to the top of the feed' },
                    label: 'Pinned',
                    name: 'is_pinned' as const,
                    type: 'checkbox' as const
                }
            ]
            : []),

        // --- SPECIFIC FIELDS FOR EVENTS ---
        ...(itemType === 'Event'
            ? [
                {
                    disabled,
                    fieldProps: { helperText: 'Where the event takes place (optional)' },
                    label: 'Location',
                    name: 'location' as const,
                    type: 'text' as const
                },
                {
                    disabled,
                    fieldProps: { helperText: 'When the event starts' },
                    label: 'Start Date',
                    name: 'start_at' as const,
                    rules: disabled
                        ? undefined
                        : { required: 'Start date is required' },
                    type: 'date' as const
                },
                {
                    disabled,
                    fieldProps: { helperText: 'When the event ends (optional)' },
                    label: 'End Date',
                    name: 'end_at' as const,
                    type: 'date' as const
                }
            ]
            : [])
    ];

    function handleEditorChange(val: string) {
        setContent(val);
        setDescription(val);
    }

    return (
        <form {...formProps} className="flex flex-col gap-5 w-full min-w-0 max-w-full">
            <CommonForm
                component="div"
                containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                control={control}
                fields={fields}
                hasHelper
            />

            <ValidCommonToastEditor
                control={control}
                description={
                    itemType === 'Event'
                        ? 'Provide rich details, instructions, agendas, or schedules using the toolbar.'
                        : 'Use the rich text toolbar to style headings, lists, bold/italic text, tables, and links.'
                }
                disabled={disabled}
                height="320px"
                isRequired={!disabled}
                label={itemType === 'Event' ? 'Event Description' : 'Announcement Content'}
                name="description"
                placeholder={itemType === 'Event' ? 'Add event details...' : 'Write the announcement details here...'}
                rules={disabled
                    ? undefined
                    : { required: `${itemType === 'Event' ? 'Description' : 'Content'} is required` }}
                onChange={handleEditorChange}
            />

            <FileAttachmentUploader
                attachments={attachments ?? []}
                bucket="materials"
                disabled={disabled}
                folderPrefix={itemType === 'Event' ? 'events' : 'announcements'}
                onChange={setAttachments}
            />
        </form>
    );
}
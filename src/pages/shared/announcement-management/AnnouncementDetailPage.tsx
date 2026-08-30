import EntityFormPage from '@components/entity-form/EntityFormPage';
import AnnouncementForm from '@pages/shared/announcement-management/AnnouncementForm';
import { useAnnouncementBasePath } from '@pages/shared/announcement-management/useAnnouncementBasePath';
import { createAnnouncement, getAnnouncementById, updateAnnouncement } from '@services/announcement.service';
import { AnnouncementDetail, AnnouncementFormValues } from '@type/announcement.type';
import { ServiceResult } from '@type/service.type';
import { useCallback } from 'react';

const FORM_ID = 'announcement-form';

const DEFAULT_VALUES: AnnouncementFormValues = {
    attachments: [],
    author_name: '',
    content: '',
    expires_at: '',
    is_pinned: false,
    posted_on: '',
    section_ids: [],
    target_audience: 'Global',
    title: ''
};

function toFormValues(detail: AnnouncementDetail): AnnouncementFormValues {
    return {
        attachments: detail.attachments ?? [],
        author_name: detail.author_name ?? '—',
        content: detail.content,
        expires_at: detail.expires_at ?? '',
        is_pinned: detail.is_pinned,
        posted_on: formatTimestamp(detail.published_at ?? detail.created_at),
        section_ids: detail.section_ids,
        target_audience: detail.target_audience,
        title: detail.title
    };
}

function formatTimestamp(value: string | null): string {
    if (!value) {
        return '—';
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
        ? '—'
        : parsed.toLocaleString();
}

export default function AnnouncementDetailPage() {
    const basePath = useAnnouncementBasePath();

    const fetchAnnouncement = useCallback(async function(
        id: string
    ): Promise<ServiceResult<AnnouncementFormValues>> {
        const result = await getAnnouncementById(id);

        if (!result.data) {
            return { data: null, error: result.error };
        }

        return { data: toFormValues(result.data), error: null };
    }, []);

    return (
        <EntityFormPage<AnnouncementFormValues>
            backTo={basePath}
            defaultValues={DEFAULT_VALUES}
            fetchById={fetchAnnouncement}
            formId={FORM_ID}
            renderForm={function({ control, disabled, id, onSubmit }) {
                return (
                    <AnnouncementForm
                        control={control}
                        disabled={disabled}
                        id={id}
                        onSubmit={onSubmit}
                    />
                );
            }}
            subheader={{
                create: 'Compose a new announcement and choose who receives it.',
                edit: 'Update the details of this announcement.',
                view: 'Viewing announcement details.'
            }}
            title={{
                create: 'Post Announcement',
                edit: 'Edit Announcement',
                view: 'View Announcement'
            }}
            onCreate={createAnnouncement}
            onUpdate={updateAnnouncement}
        />
    );
}
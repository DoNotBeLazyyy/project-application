import EntityFormPage from '@components/entity-form/EntityFormPage';
import AnnouncementForm from '@pages/shared/announcement-management/AnnouncementForm';
import { useAnnouncementBasePath } from '@pages/shared/announcement-management/useAnnouncementBasePath';
import { createAnnouncement, getAnnouncementById, updateAnnouncement } from '@services/announcement.service';
import { AnnouncementDetail, AnnouncementFormValues } from '@type/announcement.type';
import { ServiceResult } from '@type/service.type';
import { useCallback, useState } from 'react';

const FORM_ID = 'announcement-form';

const DEFAULT_VALUES: AnnouncementFormValues = {
    content: '',
    expires_at: '',
    is_pinned: false,
    section_ids: [],
    target_audience: 'Global',
    title: ''
};

function toFormValues(detail: AnnouncementDetail): AnnouncementFormValues {
    return {
        content: detail.content,
        expires_at: detail.expires_at ?? '',
        is_pinned: detail.is_pinned,
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
    const [detail, setDetail] = useState<AnnouncementDetail | null>(null);

    const fetchAnnouncement = useCallback(async function(
        id: string
    ): Promise<ServiceResult<AnnouncementFormValues>> {
        const result = await getAnnouncementById(id);

        if (!result.data) {
            return { data: null, error: result.error };
        }

        setDetail(result.data);

        return { data: toFormValues(result.data), error: null };
    }, []);

    return (
        <EntityFormPage<AnnouncementFormValues>
            backTo={basePath}
            defaultValues={DEFAULT_VALUES}
            fetchById={fetchAnnouncement}
            formId={FORM_ID}
            renderForm={function({ control, disabled, id, mode, onSubmit }) {
                return (
                    <div className="flex flex-col gap-4">
                        {mode !== 'create' && detail && (
                            <div className="bg-(--mui-palette-action-hover) flex flex-wrap gap-6 p-3 rounded-lg">
                                <div className="flex flex-col">
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        Posted by
                                    </span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                        {detail.author_name ?? '—'}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        Posted on
                                    </span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                        {formatTimestamp(detail.published_at ?? detail.created_at)}
                                    </span>
                                </div>
                            </div>
                        )}
                        <AnnouncementForm
                            control={control}
                            disabled={disabled}
                            id={id}
                            onSubmit={onSubmit}
                        />
                    </div>
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
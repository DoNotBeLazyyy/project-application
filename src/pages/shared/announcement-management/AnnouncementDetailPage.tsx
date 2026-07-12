import EntityFormPage from '@components/entity-form/EntityFormPage';
import AnnouncementForm from '@pages/shared/announcement-management/AnnouncementForm';
import { useAnnouncementBasePath } from '@pages/shared/announcement-management/useAnnouncementBasePath';
import { createAnnouncement, getAnnouncementById, updateAnnouncement } from '@services/announcement.service';
import { AnnouncementFormValues } from '@type/announcement.type';
import { ServiceResult } from '@type/service.type';

const FORM_ID = 'announcement-form';

const DEFAULT_VALUES: AnnouncementFormValues = {
    content: '',
    expires_at: '',
    is_pinned: false,
    section_ids: [],
    target_audience: 'Global',
    title: ''
};

async function fetchAnnouncement(id: string): Promise<ServiceResult<AnnouncementFormValues>> {
    const result = await getAnnouncementById(id);

    if (!result.data) {
        return { data: null, error: result.error };
    }

    return {
        data: {
            content: result.data.content,
            expires_at: result.data.expires_at ?? '',
            is_pinned: result.data.is_pinned,
            section_ids: result.data.section_ids,
            target_audience: result.data.target_audience,
            title: result.data.title
        },
        error: null
    };
}

export default function AnnouncementDetailPage() {
    const basePath = useAnnouncementBasePath();

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
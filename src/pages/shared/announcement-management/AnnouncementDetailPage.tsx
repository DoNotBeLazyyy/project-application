import EntityFormPage from '@components/entity-form/EntityFormPage';
import AnnouncementForm from '@pages/shared/announcement-management/AnnouncementForm';
import AnnouncementViewerCard from '@pages/shared/announcement-management/AnnouncementViewerCard';
import { useAnnouncementBasePath } from '@pages/shared/announcement-management/useAnnouncementBasePath';
import EventViewerCard from '@pages/shared/event-management/EventViewerCard';
import { createAnnouncement, getAnnouncementById, updateAnnouncement } from '@services/announcement.service';
import { createEvent, getEventById, updateEvent } from '@services/event.service';
import { CommunicationFormValues, CommunicationItemType } from '@type/announcement.type';
import { EventFormValues } from '@type/event.type';
import { ServiceResult } from '@type/service.type';
import { getRoleFromPath } from '@utils/role-path.util';
import { sanitizeUuidArray } from '@utils/uuid.util';
import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

const FORM_ID = 'communication-form';

function formatTimestamp(value: string | null): string {
    if (!value) {
        return '—';
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
        ? '—'
        : parsed.toLocaleString();
}

function toDateInput(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    return value.slice(0, 10);
}

export default function AnnouncementDetailPage() {
    const basePath = useAnnouncementBasePath();
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();

    const isEventUrl = pathname.includes('/event-management') || searchParams.get('type') === 'Event';
    const initialType: CommunicationItemType = isEventUrl ? 'Event' : 'Announcement';

    const defaultValues: CommunicationFormValues = useMemo(function() {
        return {
            all_day: false,
            attachments: [],
            author_name: '',
            content: '',
            created_at: '',
            description: '',
            end_at: '',
            expires_at: '',
            is_pinned: false,
            item_type: initialType,
            location: '',
            posted_on: '',
            section_ids: [],
            start_at: '',
            target_audience: 'Global',
            title: ''
        };
    }, [initialType]);

    const fetchCommunicationItem = useCallback(async function(
        id: string
    ): Promise<ServiceResult<CommunicationFormValues>> {
        // If coming from an event path, check event first, otherwise check announcement first
        if (pathname.includes('/event-management')) {
            const eventRes = await getEventById(id);
            if (eventRes.data) {
                const d = eventRes.data;
                return {
                    data: {
                        all_day: d.all_day,
                        attachments: d.attachments ?? [],
                        author_name: d.author_name ?? 'Staff',
                        content: d.description ?? '',
                        created_at: d.created_at,
                        description: d.description ?? '',
                        end_at: toDateInput(d.end_at),
                        expires_at: '',
                        id: d.id,
                        is_pinned: false,
                        item_type: 'Event',
                        location: d.location ?? '',
                        posted_on: formatTimestamp(d.created_at),
                        section_ids: d.target_audience === 'Section' ? (d.section_ids ?? []) : [],
                        sections: d.sections ?? [],
                        start_at: toDateInput(d.start_at),
                        target_audience: d.target_audience || 'Global',
                        title: d.title
                    },
                    error: null
                };
            }
        }

        const annResult = await getAnnouncementById(id);
        if (annResult.data) {
            const d = annResult.data;
            return {
                data: {
                    all_day: false,
                    attachments: d.attachments ?? [],
                    author_name: d.author_name ?? '—',
                    content: d.content,
                    created_at: d.created_at,
                    description: d.content,
                    end_at: '',
                    expires_at: d.expires_at ?? '',
                    id: d.id,
                    is_pinned: d.is_pinned,
                    item_type: 'Announcement',
                    location: '',
                    posted_on: formatTimestamp(d.published_at ?? d.created_at),
                    section_ids: d.section_ids ?? [],
                    sections: d.sections ?? [],
                    start_at: '',
                    target_audience: d.target_audience || 'Global',
                    title: d.title
                },
                error: null
            };
        }

        const evtResult = await getEventById(id);
        if (evtResult.data) {
            const d = evtResult.data;
            return {
                data: {
                    all_day: d.all_day,
                    attachments: d.attachments ?? [],
                    author_name: d.author_name ?? 'Staff',
                    content: d.description ?? '',
                    created_at: d.created_at,
                    description: d.description ?? '',
                    end_at: toDateInput(d.end_at),
                    expires_at: '',
                    id: d.id,
                    is_pinned: false,
                    item_type: 'Event',
                    location: d.location ?? '',
                    posted_on: formatTimestamp(d.created_at),
                    section_ids: d.target_audience === 'Section' ? (d.section_ids ?? []) : [],
                    sections: d.sections ?? [],
                    start_at: toDateInput(d.start_at),
                    target_audience: d.target_audience || 'Global',
                    title: d.title
                },
                error: null
            };
        }

        return { data: null, error: annResult.error || evtResult.error };
    }, [pathname]);

    async function handleCreate(values: CommunicationFormValues) {
        const audience = values.target_audience || 'Global';
        const sectionIds = (audience === 'Section' ? (sanitizeUuidArray(values.section_ids ?? []) ?? []) : []);
        const currentRole = getRoleFromPath(pathname);

        if (values.item_type === 'Event') {
            const body = values.description || values.content || '';
            const eventPayload: EventFormValues = {
                all_day: values.all_day ?? false,
                attachments: values.attachments,
                description: body,
                end_at: values.end_at || '',
                location: values.location || '',
                section_ids: sectionIds,
                start_at: values.start_at || '',
                target_audience: audience,
                title: values.title
            };
            return createEvent(eventPayload, currentRole);
        }

        const body = values.content || values.description || '';
        return createAnnouncement({
            attachments: values.attachments,
            content: body,
            expires_at: values.expires_at || '',
            is_pinned: values.is_pinned ?? false,
            section_ids: sectionIds,
            target_audience: audience,
            title: values.title
        }, currentRole);
    }

    async function handleUpdate(id: string, values: CommunicationFormValues) {
        const audience = values.target_audience || 'Global';
        const sectionIds = (audience === 'Section' ? (sanitizeUuidArray(values.section_ids ?? []) ?? []) : []);

        if (values.item_type === 'Event') {
            const body = values.description || values.content || '';
            const eventPayload: EventFormValues = {
                all_day: values.all_day ?? false,
                attachments: values.attachments,
                description: body,
                end_at: values.end_at || '',
                location: values.location || '',
                section_ids: sectionIds,
                start_at: values.start_at || '',
                target_audience: audience,
                title: values.title
            };
            return updateEvent(id, eventPayload);
        }

        const body = values.content || values.description || '';
        return updateAnnouncement(id, {
            attachments: values.attachments,
            content: body,
            expires_at: values.expires_at || '',
            is_pinned: values.is_pinned ?? false,
            section_ids: sectionIds,
            target_audience: audience,
            title: values.title
        });
    }

    return (
        <EntityFormPage<CommunicationFormValues>
            backTo={basePath}
            defaultValues={defaultValues}
            fetchById={fetchCommunicationItem}
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
            renderView={function(values) {
                if (values.item_type === 'Event') {
                    return (
                        <EventViewerCard
                            values={{
                                all_day: values.all_day,
                                attachments: values.attachments,
                                author_name: values.author_name,
                                created_at: values.created_at,
                                description: values.description || values.content || '',
                                end_at: values.end_at,
                                location: values.location,
                                section_ids: values.section_ids,
                                sections: values.sections,
                                start_at: values.start_at,
                                target_audience: values.target_audience,
                                title: values.title
                            }}
                        />
                    );
                }
                return (
                    <AnnouncementViewerCard
                        values={{
                            attachments: values.attachments,
                            author_name: values.author_name,
                            content: values.content || values.description || '',
                            expires_at: values.expires_at,
                            is_pinned: values.is_pinned,
                            posted_on: values.posted_on,
                            section_ids: values.section_ids,
                            sections: values.sections,
                            target_audience: values.target_audience,
                            title: values.title
                        }}
                    />
                );
            }}
            subheader={{
                create: 'Compose an announcement or schedule an event for your community.',
                edit: 'Update the details of this item.',
                view: 'Preview how this item appears to your audience.'
            }}
            title={{
                create: 'Post Announcement or Event',
                edit: 'Edit Announcement or Event',
                view: 'Post Details'
            }}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
        />
    );
}
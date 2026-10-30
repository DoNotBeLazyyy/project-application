import EntityFormPage from '@components/entity-form/EntityFormPage';
import AnnouncementForm from '@pages/shared/announcement-management/AnnouncementForm';
import AnnouncementViewerCard from '@pages/shared/announcement-management/AnnouncementViewerCard';
import { useAnnouncementBasePath } from '@pages/shared/announcement-management/useAnnouncementBasePath';
import EventViewerCard from '@pages/shared/announcement-management/EventViewerCard';
import { createAnnouncement, deleteAnnouncement, getAnnouncementById, getAnnouncementSectionOptions, updateAnnouncement } from '@services/announcement.service';
import { createEvent, deleteEvent, getEventById, updateEvent } from '@services/event.service';
import { useAppStore } from '@stores/app.store';
import { AnnouncementAudience, CommunicationFormValues, CommunicationItemType } from '@type/announcement.type';
import { EventFormValues } from '@type/event.type';
import { ServiceResult } from '@type/service.type';
import { canManageCommunication } from '@utils/communication.util';
import { getRoleFromPath } from '@utils/role-path.util';
import { sanitizeUuidArray } from '@utils/uuid.util';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

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

function toEventDateInput(value: string | null | undefined, allDay = false): string {
    if (!value) {
        return '';
    }
    if (allDay) {
        return value.slice(0, 10);
    }
    return value;
}

export default function AnnouncementDetailPage() {
    const announcementBasePath = useAnnouncementBasePath();
    const location = useLocation();
    const { pathname } = location;
    const [searchParams] = useSearchParams();

    const currentUserId = useAppStore((s) => s.userProfile?.id || s.session?.user?.id);
    const currentRole = getRoleFromPath(pathname);
    const [loadedItem, setLoadedItem] = useState<{
        created_by?: string | null;
        created_by_role?: string | null;
        target_audience?: AnnouncementAudience;
    } | null>(null);
    const [loadedItemType, setLoadedItemType] = useState<CommunicationItemType | null>(null);

    const navigate = useNavigate();
    const isEventUrl = pathname.includes('/event-management') || searchParams.get('type') === 'Event';
    const basePath = (location.state as { from?: string } | null)?.from || announcementBasePath;
    const initialType: CommunicationItemType = isEventUrl ? 'Event' : 'Announcement';
    const isFacultyOnly = currentRole === 'Faculty';

    const defaultValues: CommunicationFormValues = useMemo(function() {
        const stateDate = (location.state as { defaultDate?: string | Date } | null)?.defaultDate;
        let defaultStartAt = '';
        if (stateDate && initialType === 'Event') {
            const dt = stateDate instanceof Date ? new Date(stateDate.getTime()) : new Date(stateDate);
            if (!Number.isNaN(dt.getTime())) {
                dt.setHours(9, 0, 0, 0);
                defaultStartAt = dt.toISOString();
            }
        }

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
            start_at: defaultStartAt,
            target_audience: isFacultyOnly ? 'Section' : 'Global',
            title: ''
        };
    }, [initialType, isFacultyOnly, location.state]);

    const fetchCommunicationItem = useCallback(async function(
        id: string
    ): Promise<ServiceResult<CommunicationFormValues>> {
        const checkEventFirst = pathname.includes('/event-management') || searchParams.get('type') === 'Event';

        if (checkEventFirst) {
            const eventRes = await getEventById(id, { silent: true });
            if (eventRes.data) {
                const d = eventRes.data;
                setLoadedItem({
                    created_by: d.created_by,
                    created_by_role: d.created_by_role,
                    target_audience: d.target_audience
                });
                setLoadedItemType('Event');
                return {
                    data: {
                        all_day: d.all_day,
                        attachments: d.attachments ?? [],
                        author_name: d.author_name ?? 'Staff',
                        content: d.description ?? '',
                        created_at: d.created_at,
                        created_by: d.created_by,
                        created_by_role: d.created_by_role,
                        description: d.description ?? '',
                        end_at: toEventDateInput(d.end_at, d.all_day),
                        expires_at: '',
                        id: d.id,
                        is_pinned: false,
                        item_type: 'Event',
                        location: d.location ?? '',
                        posted_on: formatTimestamp(d.created_at),
                        section_ids: d.target_audience === 'Section' ? (d.section_ids ?? []) : [],
                        sections: d.sections ?? [],
                        start_at: toEventDateInput(d.start_at, d.all_day),
                        target_audience: d.target_audience || 'Global',
                        title: d.title
                    },
                    error: null
                };
            }

            const annResult = await getAnnouncementById(id, { silent: true });
            if (annResult.data) {
                const d = annResult.data;
                setLoadedItem({
                    created_by: d.created_by,
                    created_by_role: d.created_by_role,
                    target_audience: d.target_audience
                });
                setLoadedItemType('Announcement');
                return {
                    data: {
                        all_day: false,
                        attachments: d.attachments ?? [],
                        author_name: d.author_name ?? '—',
                        content: d.content,
                        created_at: d.created_at,
                        created_by: d.created_by,
                        created_by_role: d.created_by_role,
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

            return { data: null, error: eventRes.error || annResult.error };
        } else {
            const annResult = await getAnnouncementById(id, { silent: true });
            if (annResult.data) {
                const d = annResult.data;
                setLoadedItem({
                    created_by: d.created_by,
                    created_by_role: d.created_by_role,
                    target_audience: d.target_audience
                });
                setLoadedItemType('Announcement');
                return {
                    data: {
                        all_day: false,
                        attachments: d.attachments ?? [],
                        author_name: d.author_name ?? '—',
                        content: d.content,
                        created_at: d.created_at,
                        created_by: d.created_by,
                        created_by_role: d.created_by_role,
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

            const evtResult = await getEventById(id, { silent: true });
            if (evtResult.data) {
                const d = evtResult.data;
                setLoadedItem({
                    created_by: d.created_by,
                    created_by_role: d.created_by_role,
                    target_audience: d.target_audience
                });
                setLoadedItemType('Event');
                return {
                    data: {
                        all_day: d.all_day,
                        attachments: d.attachments ?? [],
                        author_name: d.author_name ?? 'Staff',
                        content: d.description ?? '',
                        created_at: d.created_at,
                        created_by: d.created_by,
                        created_by_role: d.created_by_role,
                        description: d.description ?? '',
                        end_at: toEventDateInput(d.end_at, d.all_day),
                        expires_at: '',
                        id: d.id,
                        is_pinned: false,
                        item_type: 'Event',
                        location: d.location ?? '',
                        posted_on: formatTimestamp(d.created_at),
                        section_ids: d.target_audience === 'Section' ? (d.section_ids ?? []) : [],
                        sections: d.sections ?? [],
                        start_at: toEventDateInput(d.start_at, d.all_day),
                        target_audience: d.target_audience || 'Global',
                        title: d.title
                    },
                    error: null
                };
            }

            return { data: null, error: annResult.error || evtResult.error };
        }
    }, [pathname, searchParams]);

    async function handleCreate(values: CommunicationFormValues) {
        const isFacultyOnly = getRoleFromPath(pathname) === 'Faculty';
        const audience = isFacultyOnly ? 'Section' : (values.target_audience || 'Global');
        let sectionIds = (audience === 'Section' ? (sanitizeUuidArray(values.section_ids ?? []) ?? []) : []);
        const currentRole = getRoleFromPath(pathname);

        if (isFacultyOnly && sectionIds.length === 0) {
            const secRes = await getAnnouncementSectionOptions();
            if (secRes.data && secRes.data.length > 0) {
                sectionIds = [secRes.data[0].id];
            }
        }

        if (values.item_type === 'Event') {
            const body = (values.description || values.content || '').trim();
            const isAllDay = Boolean(values.all_day);
            const startAt = values.start_at ? values.start_at.trim() : '';
            const endAt = values.end_at ? values.end_at.trim() : '';
            const eventPayload: EventFormValues = {
                all_day: isAllDay,
                attachments: values.attachments,
                description: body,
                end_at: endAt,
                location: values.location ? values.location.trim() : '',
                section_ids: sectionIds,
                start_at: startAt,
                target_audience: audience,
                title: values.title.trim()
            };
            return createEvent(eventPayload, currentRole);
        }

        const body = (values.content || values.description || '').trim();
        return createAnnouncement({
            attachments: values.attachments,
            content: body,
            expires_at: values.expires_at || '',
            is_pinned: values.is_pinned ?? false,
            section_ids: sectionIds,
            target_audience: audience,
            title: values.title.trim()
        }, currentRole);
    }

    async function handleUpdate(id: string, values: CommunicationFormValues) {
        if (!canEdit) {
            return { data: null, error: { message: 'You do not have permission to edit this item.' } as any };
        }

        const isFacultyOnly = currentRole === 'Faculty';
        const audience = isFacultyOnly ? 'Section' : (values.target_audience || 'Global');
        let sectionIds = (audience === 'Section' ? (sanitizeUuidArray(values.section_ids ?? []) ?? []) : []);

        if (isFacultyOnly && sectionIds.length === 0) {
            const secRes = await getAnnouncementSectionOptions();
            if (secRes.data && secRes.data.length > 0) {
                sectionIds = [secRes.data[0].id];
            }
        }

        if (values.item_type === 'Event') {
            const body = (values.description || values.content || '').trim();
            const isAllDay = Boolean(values.all_day);
            const startAt = values.start_at ? values.start_at.trim() : '';
            const endAt = values.end_at ? values.end_at.trim() : '';
            const eventPayload: EventFormValues = {
                all_day: isAllDay,
                attachments: values.attachments,
                description: body,
                end_at: endAt,
                location: values.location ? values.location.trim() : '',
                section_ids: sectionIds,
                start_at: startAt,
                target_audience: audience,
                title: values.title.trim()
            };

            if (loadedItemType === 'Announcement') {
                const createRes = await createEvent(eventPayload, currentRole);
                if (createRes.data) {
                    await deleteAnnouncement(id);
                    navigate(basePath, { replace: true });
                    return { data: createRes.data as unknown as CommunicationFormValues, error: null };
                }
                return { data: null, error: createRes.error };
            }

            return updateEvent(id, eventPayload);
        }

        const body = (values.content || values.description || '').trim();
        const annPayload = {
            attachments: values.attachments,
            content: body,
            expires_at: values.expires_at || '',
            is_pinned: values.is_pinned ?? false,
            section_ids: sectionIds,
            target_audience: audience,
            title: values.title.trim()
        };

        if (loadedItemType === 'Event') {
            const createRes = await createAnnouncement(annPayload, currentRole);
            if (createRes.data) {
                await deleteEvent(id);
                navigate(basePath, { replace: true });
                return { data: createRes.data as unknown as CommunicationFormValues, error: null };
            }
            return { data: null, error: createRes.error };
        }

        return updateAnnouncement(id, annPayload);
    }

    const isStudent = currentRole === 'Student';
    const canEdit = !isStudent && (
        !loadedItem || canManageCommunication(loadedItem, currentUserId, currentRole)
    );

    return (
        <EntityFormPage<CommunicationFormValues>
            backTo={basePath}
            canEdit={canEdit}
            defaultValues={defaultValues}
            fetchById={fetchCommunicationItem}
            formId={FORM_ID}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            renderForm={function({ control, disabled, id, onSubmit }) {
                return (
                    <AnnouncementForm
                        control={control}
                        disabled={disabled}
                        id={id}
                        isTypeDisabled={isEventUrl}
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
        />
    );
}
import EntityFormPage from '@components/entity-form/EntityFormPage';
import { ALL_SECTIONS_VALUE } from '@constants/event.constant';
import EventForm from '@pages/shared/event-management/EventForm';
import { useEventBasePath } from '@pages/shared/event-management/useEventBasePath';
import { createEvent, getEventById, updateEvent } from '@services/event.service';
import { EventFormValues } from '@type/event.type';
import { ServiceResult } from '@type/service.type';

const FORM_ID = 'event-form';

const DEFAULT_VALUES: EventFormValues = {
    attachments: [],
    description: '',
    end_at: '',
    location: '',
    section_ids: [],
    start_at: '',
    title: ''
};

function toDateInput(value: string | null): string {
    if (!value) {
        return '';
    }

    return value.slice(0, 10);
}

async function fetchEvent(id: string): Promise<ServiceResult<EventFormValues>> {
    const result = await getEventById(id);

    if (!result.data) {
        return { data: null, error: result.error };
    }

    return {
        data: {
            attachments: result.data.attachments ?? [],
            description: result.data.description ?? '',
            end_at: toDateInput(result.data.end_at),
            location: result.data.location ?? '',
            section_ids: result.data.target_audience === 'Section'
                ? result.data.section_ids
                : [ALL_SECTIONS_VALUE],
            start_at: toDateInput(result.data.start_at),
            title: result.data.title
        },
        error: null
    };
}

export default function EventDetailPage() {
    const basePath = useEventBasePath();

    return (
        <EntityFormPage<EventFormValues>
            backTo={basePath}
            defaultValues={DEFAULT_VALUES}
            fetchById={fetchEvent}
            formId={FORM_ID}
            renderForm={function({ control, disabled, id, onSubmit }) {
                return (
                    <EventForm
                        control={control}
                        disabled={disabled}
                        id={id}
                        onSubmit={onSubmit}
                    />
                );
            }}
            subheader={{
                create: 'Schedule a new event and choose who sees it.',
                edit: 'Update the details of this event.',
                view: 'Viewing event details.'
            }}
            title={{
                create: 'Create Event',
                edit: 'Edit Event',
                view: 'View Event'
            }}
            onCreate={createEvent}
            onUpdate={updateEvent}
        />
    );
}
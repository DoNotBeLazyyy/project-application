import { Navigate, useParams } from 'react-router-dom';

interface CommunicationRedirectProps {
    basePath: string;
    itemType: 'Announcement' | 'Event';
}

// Old or shared links to a single post open it in the list's detail modal, which is the one
// viewer the dashboard, notifications and the list all use
export default function CommunicationRedirect({ basePath, itemType }: CommunicationRedirectProps) {
    const { id = '' } = useParams<{ id: string }>();
    const param = itemType === 'Event'
        ? 'eventId'
        : 'announcementId';

    return (
        <Navigate
            replace
            to={id
                ? `${basePath}?${param}=${id}`
                : basePath}
        />
    );
}
import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

export default function FacultyLoadDetailPage() {
    const navigate = useNavigate();
    const { facultyId = '' } = useParams<{ facultyId: string }>();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const termId = searchParams.get('termId');
        navigate(
            `/dean/faculty-load?facultyId=${facultyId}${termId
                ? `&termId=${termId}`
                : ''}`,
            { replace: true }
        );
    }, [facultyId, searchParams, navigate]);

    return null;
}
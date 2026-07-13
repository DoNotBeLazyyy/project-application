import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { getFacultyLoadDetail } from '@services/faculty-load.service';
import { FacultyLoadDetail } from '@type/faculty-load.type';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

export default function FacultyLoadDetailPage() {
    const navigate = useNavigate();
    const { facultyId = '' } = useParams<{ facultyId: string }>();
    const [searchParams] = useSearchParams();
    const [detail, setDetail] = useState<FacultyLoadDetail | null>(null);

    const termId = searchParams.get('termId');

    useEffect(function() {
        if (!facultyId) {
            return;
        }

        async function loadDetail() {
            const result = await getFacultyLoadDetail(facultyId, termId);

            if (result.data) {
                setDetail(result.data);
            }
        }

        loadDetail();
    }, [facultyId, termId]);

    const sections = detail?.sections ?? [];
    const totalUnits = sections.reduce((sum, section) => sum + Number(section.units), 0);
    const totalStudents = sections.reduce((sum, section) => sum + section.enrolled_count, 0);

    return (
        <CommonCard className="h-full w-full">
            <div className="flex flex-col gap-6 h-full overflow-y-auto">
                <div className="flex gap-3 items-start">
                    <CommonButton
                        size="small"
                        startIcon={<ArrowLeftIcon size={16} />}
                        variant="text"
                        onClick={() => navigate('/dean/faculty-load')}
                    >
                        Back
                    </CommonButton>
                    <div className="flex flex-col gap-1">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                            {detail?.faculty.faculty_name ?? '—'}
                        </h1>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {detail?.faculty.email ?? ''}
                        </span>
                    </div>
                </div>

                <div className="gap-4 grid grid-cols-1 sm:grid-cols-3">
                    <div className="border border-(--mui-palette-divider) flex flex-col gap-1 rounded-lg p-4">
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Sections
                        </span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                            {sections.length}
                        </span>
                    </div>
                    <div className="border border-(--mui-palette-divider) flex flex-col gap-1 rounded-lg p-4">
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Total Units
                        </span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                            {totalUnits}
                        </span>
                    </div>
                    <div className="border border-(--mui-palette-divider) flex flex-col gap-1 rounded-lg p-4">
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Enrolled Students
                        </span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                            {totalStudents}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <h2 className="font-medium text-(--mui-palette-text-primary) text-base">
                        Assigned Sections
                    </h2>

                    {sections.length === 0 && (
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            This faculty member has no sections in the selected term.
                        </span>
                    )}

                    {sections.map(function(section) {
                        return (
                            <div
                                className="border border-(--mui-palette-divider) flex flex-col gap-2 rounded-lg p-4"
                                key={section.section_id}
                            >
                                <div className="flex flex-wrap gap-2 items-center justify-between">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                        {section.section_code} — {section.course_code} {section.course_title}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        {section.term_label}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        {section.units} unit(s)
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        {section.enrolled_count} enrolled
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {section.schedules.length === 0 && (
                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                            No meeting times set.
                                        </span>
                                    )}
                                    {section.schedules.map(function(slot, index) {
                                        return (
                                            <span
                                                className="text-(--mui-palette-text-secondary) text-xs"
                                                key={`${section.section_id}-${index}`}
                                            >
                                                {slot.day_of_week} {slot.time_start} – {slot.time_end}
                                                {slot.room
                                                    ? ` · ${slot.room}`
                                                    : ''}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </CommonCard>
    );
}
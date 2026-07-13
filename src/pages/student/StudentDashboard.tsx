import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import StudentInsightSummaryCard from '@components/dashboard/StudentInsightSummaryCard';
import useDashboardFeeds from '@hooks/useDashboardFeeds';
import { BookOpenIcon, CalendarCheckIcon, GraduationCapIcon } from '@phosphor-icons/react';
import { getStudentInsight } from '@services/analytics.service';
import { getStudentDashboard } from '@services/student-portal.service';
import { StudentInsight } from '@type/analytics.type';
import { AssessmentType } from '@type/assessment.type';
import { StudentDashboard as StudentDashboardData, UpcomingAssessment } from '@type/student-portal.type';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ASSESSMENT_TYPE_VARIANT: Record<AssessmentType, 'success' | 'error' | 'warning' | 'info'> = {
    Quiz: 'info',
    Exam: 'error',
    Activity: 'success',
    Assignment: 'warning',
    Project: 'info',
    'Lab Report': 'warning'
};

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { announcements, events } = useDashboardFeeds();
    const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
    const [insight, setInsight] = useState<StudentInsight | null>(null);

    useEffect(function() {
        async function fetchDashboard() {
            const result = await getStudentDashboard();
            if (result.data) setDashboard(result.data);
        }

        async function fetchInsight() {
            const result = await getStudentInsight();
            if (result.data?.success) setInsight(result.data);
        }

        fetchDashboard();
        fetchInsight();
    }, []);

    function handleViewInsight() {
        navigate('/student/insight');
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-4">
                <CommonCard className="flex-1 p-4">
                    <div className="flex gap-3 items-center">
                        <div className="bg-(--mui-palette-primary-light) flex h-10 items-center justify-center rounded-lg w-10">
                            <BookOpenIcon
                                className="text-(--mui-palette-primary-main)"
                                size={20}
                                weight="bold"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-(--mui-palette-text-primary) text-2xl">
                                {dashboard?.enrolled_count ?? '—'}
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-sm">
                                Enrolled Subjects
                            </span>
                        </div>
                    </div>
                </CommonCard>
                <CommonCard className="flex-1 p-4">
                    <div className="flex gap-3 items-center">
                        <div className="bg-(--mui-palette-warning-light) flex h-10 items-center justify-center rounded-lg w-10">
                            <CalendarCheckIcon
                                className="text-(--mui-palette-warning-main)"
                                size={20}
                                weight="bold"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-(--mui-palette-text-primary) text-2xl">
                                {dashboard?.upcoming_assessments?.length ?? '—'}
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-sm">
                                Upcoming Assessments
                            </span>
                        </div>
                    </div>
                </CommonCard>
                <CommonCard className="flex-1 p-4">
                    <div className="flex gap-3 items-center">
                        <div className="bg-(--mui-palette-info-light) flex h-10 items-center justify-center rounded-lg w-10">
                            <GraduationCapIcon
                                className="text-(--mui-palette-info-main)"
                                size={20}
                                weight="bold"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-(--mui-palette-text-primary) text-2xl">
                                {dashboard?.pending_grades_count ?? '—'}
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-sm">
                                Grades to View
                            </span>
                        </div>
                    </div>
                </CommonCard>
            </div>

            <StudentInsightSummaryCard
                insight={insight}
                onViewInsight={handleViewInsight}
            />

            <CommonCard
                cardHeaderProps={{
                    subheader: 'Assessments that are open and not yet submitted.',
                    title: 'Upcoming Assessments'
                }}
                className="flex flex-col"
            >
                <div className="flex flex-col gap-2 p-4 pt-0">
                    {!dashboard?.upcoming_assessments?.length && (
                        <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                            No upcoming assessments.
                        </p>
                    )}
                    {dashboard?.upcoming_assessments?.map((assessment: UpcomingAssessment) => (
                        <div
                            className="border border-(--mui-palette-divider) flex gap-3 items-center justify-between p-3 rounded-lg"
                            key={assessment.id}
                        >
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex gap-2 items-center">
                                    <CommonBadgeStatus
                                        label={assessment.assessment_type}
                                        variant={ASSESSMENT_TYPE_VARIANT[assessment.assessment_type]}
                                    />
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {assessment.title}
                                    </span>
                                </div>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    {assessment.course_code} · {assessment.section_code}
                                    {assessment.due_at && (
                                        ` · Due ${new Date(assessment.due_at)
                                            .toLocaleString()}`
                                    )}
                                </span>
                            </div>
                            <CommonButton
                                size="small"
                                variant="contained"
                                onClick={function() {
                                    navigate(`/student/subjects/${assessment.enrollment_id}/assessments/${assessment.id}`);
                                }}
                            >
                                Take
                            </CommonButton>
                        </div>
                    ))}
                </div>
            </CommonCard>

            <div className="gap-4 grid grid-cols-1 xl:grid-cols-2">
                <AnnouncementsFeedCard announcements={announcements} />
                <EventsFeedCard events={events} />
            </div>
        </div>
    );
}
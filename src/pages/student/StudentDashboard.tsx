import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import StatCard from '@components/card/StatCard';
import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import DashboardHeader from '@components/dashboard/DashboardHeader';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import InstitutionalIdentityCard from '@components/dashboard/InstitutionalIdentityCard';
import StudentInsightSummaryCard from '@components/dashboard/StudentInsightSummaryCard';
import useDashboardFeeds from '@hooks/useDashboardFeeds';
import { BookOpenIcon, CalendarCheckIcon, GraduationCapIcon } from '@phosphor-icons/react';
import { getStudentInsight } from '@services/analytics.service';
import { getStudentDashboard } from '@services/student-portal.service';
import { StudentInsight } from '@type/analytics.type';
import { AssessmentType } from '@type/assessment.type';
import { StudentDashboard as StudentDashboardData, UpcomingAssessment } from '@type/student-portal.type';
import { resolveStatValue } from '@utils/dashboard.util';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ASSESSMENT_TYPE_VARIANT: Record<AssessmentType, 'success' | 'error' | 'warning' | 'info'> = {
    Quiz: 'info',
    Exam: 'error',
    Activity: 'success',
    Assignment: 'warning',
    Project: 'info',
    'Lab Report': 'warning'
};

type StudentStatKey = 'enrolled' | 'upcoming' | 'released';

interface StudentStatCard {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    statKey: StudentStatKey;
    to: string;
}

const STAT_CARDS: StudentStatCard[] = [
    {
        icon: <BookOpenIcon size={24} />,
        iconBg: 'bg-(--mui-palette-primary-light)',
        iconColor: 'text-(--mui-palette-primary-main)',
        label: 'Enrolled Subjects',
        statKey: 'enrolled',
        to: '/student/subjects'
    },
    {
        icon: <CalendarCheckIcon size={24} />,
        iconBg: 'bg-(--mui-palette-warning-light)',
        iconColor: 'text-(--mui-palette-warning-main)',
        label: 'Upcoming Assessments',
        statKey: 'upcoming',
        to: '/student/subjects'
    },
    {
        icon: <GraduationCapIcon size={24} />,
        iconBg: 'bg-(--mui-palette-info-light)',
        iconColor: 'text-(--mui-palette-info-main)',
        label: 'Grades to View',
        statKey: 'released',
        to: '/student/grade'
    }
];

function resolveStudentStatValue(dashboard: StudentDashboardData | null, statKey: StudentStatKey): number | string {
    if (!dashboard) {
        return '—';
    }

    if (statKey === 'enrolled') {
        return resolveStatValue(dashboard.enrolled_count);
    }

    if (statKey === 'upcoming') {
        return resolveStatValue(dashboard.upcoming_count);
    }

    return resolveStatValue(dashboard.released_grades_count);
}

export default function StudentDashboard() {
    const navigate = useNavigate();
    const {
        announcements,
        announcementsError,
        events,
        eventsError
    } = useDashboardFeeds();
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
            <DashboardHeader
                subtitle="Your classes, assessments, and grades at a glance."
                title="Dashboard"
            />

            <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                {STAT_CARDS.map((card) => (
                    <StatCard
                        icon={card.icon}
                        iconBg={card.iconBg}
                        iconColor={card.iconColor}
                        key={card.label}
                        label={card.label}
                        to={card.to}
                        value={resolveStudentStatValue(dashboard, card.statKey)}
                    />
                ))}
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
                <AnnouncementsFeedCard
                    announcements={announcements}
                    error={announcementsError}
                />
                <EventsFeedCard
                    error={eventsError}
                    events={events}
                />
            </div>

            <InstitutionalIdentityCard />
        </div>
    );
}